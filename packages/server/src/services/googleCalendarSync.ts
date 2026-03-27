import { execSync } from "child_process";
import { db } from "../db";
import { tasks, syncState } from "../db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

const GWS = `${process.env.HOME}/.npm-global/bin/gws`;
const CALENDARS = ["coolhouette@gmail.com", "cooliarment@gmail.com"];

export interface SyncResult {
  added: number;
  updated: number;
  pushed: number;
  errors: string[];
}

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  updated?: string;
  status?: string;
  recurrence?: string[];
}

interface GoogleEventsResponse {
  items?: GoogleEvent[];
  nextSyncToken?: string;
}

// ── gws CLI 래퍼 ──

function gwsListEvents(calendarId: string, timeMin: string, timeMax: string): GoogleEvent[] {
  try {
    const params = JSON.stringify({
      calendarId,
      timeMin,
      timeMax,
      maxResults: 2500,
      singleEvents: true,
      orderBy: "startTime",
    });
    const raw = execSync(`${GWS} calendar events list --params '${params}'`, {
      encoding: "utf-8",
      timeout: 30000,
    });
    // gws prints "Using keyring backend: keyring" on first line
    const jsonStr = raw.substring(raw.indexOf("{"));
    const data: GoogleEventsResponse = JSON.parse(jsonStr);
    return (data.items || []).filter((e) => e.status !== "cancelled");
  } catch (err: any) {
    console.error(`[sync] gws list failed for ${calendarId}:`, err.message);
    return [];
  }
}

function gwsInsertEvent(calendarId: string, event: {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}): string | null {
  try {
    const params = JSON.stringify({ calendarId });
    const body = JSON.stringify(event);
    const raw = execSync(
      `${GWS} calendar events insert --params '${params}' --json '${body.replace(/'/g, "'\\''")}'`,
      { encoding: "utf-8", timeout: 15000 },
    );
    const jsonStr = raw.substring(raw.indexOf("{"));
    const created = JSON.parse(jsonStr);
    return created.id || null;
  } catch (err: any) {
    console.error(`[sync] gws insert failed:`, err.message);
    return null;
  }
}

function gwsUpdateEvent(calendarId: string, eventId: string, event: {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}): boolean {
  try {
    const params = JSON.stringify({ calendarId, eventId });
    const body = JSON.stringify(event);
    execSync(
      `${GWS} calendar events update --params '${params}' --json '${body.replace(/'/g, "'\\''")}'`,
      { encoding: "utf-8", timeout: 15000 },
    );
    return true;
  } catch (err: any) {
    console.error(`[sync] gws update failed:`, err.message);
    return false;
  }
}

function gwsDeleteEvent(calendarId: string, eventId: string): boolean {
  try {
    const params = JSON.stringify({ calendarId, eventId });
    execSync(
      `${GWS} calendar events delete --params '${params}'`,
      { encoding: "utf-8", timeout: 15000 },
    );
    return true;
  } catch (err: any) {
    console.error(`[sync] gws delete failed:`, err.message);
    return false;
  }
}

// ── 변환 유틸 ──

function googleToLocal(ge: GoogleEvent, calendarId: string) {
  const isAllDay = !!ge.start.date;
  const startAt = ge.start.dateTime || ge.start.date || "";
  const endAt = ge.end?.dateTime || ge.end?.date || null;

  return {
    title: ge.summary || "(제목 없음)",
    description: ge.description || null,
    startAt,
    endAt,
    allDay: isAllDay,
    location: ge.location || null,
    source: "google" as const,
    externalId: `${calendarId}::${ge.id}`,
    color: null as string | null,
  };
}

export function localToGoogle(ev: typeof tasks.$inferSelect) {
  const isAllDay = ev.allDay ?? false;
  const startAt = ev.startAt || "";
  const endAt = ev.endAt;

  const start = isAllDay
    ? { date: startAt.slice(0, 10) }
    : { dateTime: startAt.includes("T") ? startAt : `${startAt}T00:00:00` };
  const end = endAt
    ? isAllDay
      ? { date: endAt.slice(0, 10) }
      : { dateTime: endAt.includes("T") ? endAt : `${endAt}T00:00:00` }
    : isAllDay
      ? { date: startAt.slice(0, 10) }
      : { dateTime: startAt.includes("T") ? startAt : `${startAt}T00:00:00` };

  return {
    summary: ev.title,
    description: ev.description || undefined,
    location: ev.location || undefined,
    start,
    end,
  };
}

// ── 개별 이벤트 push 함수 ──

const PRIMARY_CALENDAR = CALENDARS[1]; // cooliarment@gmail.com

/** 로컬 태스크를 구글에 생성하고 externalId 반환 */
export function pushEventToGoogle(ev: typeof tasks.$inferSelect): string | null {
  if (!ev.startAt) return null; // backlog 태스크는 push하지 않음
  const googleEvent = localToGoogle(ev);
  const googleId = gwsInsertEvent(PRIMARY_CALENDAR, googleEvent);
  if (googleId) {
    const externalId = `${PRIMARY_CALENDAR}::${googleId}`;
    const now = new Date().toISOString();
    db.update(tasks)
      .set({ source: "google", externalId, updatedAt: now })
      .where(eq(tasks.id, ev.id))
      .run();
    console.log(`[push] Task "${ev.title}" pushed to Google (${externalId})`);
    return externalId;
  }
  console.error(`[push] Failed to push task "${ev.title}" to Google`);
  return null;
}

/** 기존 구글 이벤트 업데이트 (externalId 필요) */
export function updateEventOnGoogle(ev: typeof tasks.$inferSelect): boolean {
  if (!ev.externalId || !ev.startAt) return false;
  const [calendarId, eventId] = ev.externalId.split("::");
  if (!calendarId || !eventId) return false;
  const googleEvent = localToGoogle(ev);
  const ok = gwsUpdateEvent(calendarId, eventId, googleEvent);
  if (ok) {
    console.log(`[push] Task "${ev.title}" updated on Google (${ev.externalId})`);
  }
  return ok;
}

/** 구글 이벤트 삭제 (externalId 필요) */
export function deleteEventFromGoogle(externalId: string): boolean {
  const [calendarId, eventId] = externalId.split("::");
  if (!calendarId || !eventId) return false;
  const ok = gwsDeleteEvent(calendarId, eventId);
  if (ok) {
    console.log(`[push] Event deleted from Google (${externalId})`);
  }
  return ok;
}

// ── 메인 동기화 ──

export async function syncGoogleCalendar(): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, pushed: 0, errors: [] };
  const now = new Date().toISOString();

  // 동기화 범위: 과거 30일 ~ 미래 90일
  const timeMin = new Date(Date.now() - 30 * 86400000).toISOString();
  const timeMax = new Date(Date.now() + 90 * 86400000).toISOString();

  // DB에서 start_at이 있는 태스크 로드 (캘린더에 해당하는 것들)
  const localTasks = db.select().from(tasks)
    .where(isNotNull(tasks.startAt))
    .all();
  const localByExternalId = new Map(
    localTasks.filter((t) => t.externalId).map((t) => [t.externalId!, t]),
  );

  // 1) 구글 → LifeKit: 각 캘린더에서 이벤트 가져오기
  const allGoogleEvents: { event: GoogleEvent; calendarId: string }[] = [];

  for (const calendarId of CALENDARS) {
    const events = gwsListEvents(calendarId, timeMin, timeMax);
    for (const ge of events) {
      allGoogleEvents.push({ event: ge, calendarId });
    }
  }

  const seenExternalIds = new Set<string>();

  for (const { event: ge, calendarId } of allGoogleEvents) {
    const externalId = `${calendarId}::${ge.id}`;
    seenExternalIds.add(externalId);

    const local = localByExternalId.get(externalId);

    if (!local) {
      // 구글에만 있음 → tasks에 추가 (source: "google")
      try {
        const data = googleToLocal(ge, calendarId);
        const id = randomUUIDv7();
        db.insert(tasks)
          .values({
            id,
            ...data,
            status: "todo",
            priority: "P2",
            createdAt: now,
            updatedAt: now,
          })
          .run();
        result.added++;
      } catch (err: any) {
        result.errors.push(`add ${ge.id}: ${err.message}`);
      }
    } else {
      // 양쪽에 있음 → 최근 수정 기준 merge
      const googleUpdated = ge.updated ? new Date(ge.updated).getTime() : 0;
      const localUpdated = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;

      if (googleUpdated > localUpdated) {
        // 구글이 더 최신 → DB 업데이트
        try {
          const data = googleToLocal(ge, calendarId);
          db.update(tasks)
            .set({
              title: data.title,
              description: data.description,
              startAt: data.startAt,
              endAt: data.endAt,
              allDay: data.allDay,
              location: data.location,
              updatedAt: now,
            })
            .where(eq(tasks.id, local.id))
            .run();
          result.updated++;
        } catch (err: any) {
          result.errors.push(`update ${ge.id}: ${err.message}`);
        }
      }
    }
  }

  // 2) LifeKit → 구글: manual 태스크(start_at 있는 것)를 구글에 push
  const primaryCalendar = CALENDARS[0];
  const manualTasks = localTasks.filter(
    (t) => t.source === "manual" && !t.externalId && t.startAt,
  );

  for (const ev of manualTasks) {
    const googleEvent = localToGoogle(ev);
    const googleId = gwsInsertEvent(primaryCalendar, googleEvent);

    if (googleId) {
      const externalId = `${primaryCalendar}::${googleId}`;
      db.update(tasks)
        .set({ source: "google", externalId, updatedAt: now })
        .where(eq(tasks.id, ev.id))
        .run();
      result.pushed++;
    } else {
      result.errors.push(`push ${ev.id}: insert failed`);
    }
  }

  // 동기화 상태 저장
  const existing = db.select().from(syncState).where(eq(syncState.provider, "google")).get();
  if (existing) {
    db.update(syncState)
      .set({ lastSyncAt: now })
      .where(eq(syncState.id, existing.id))
      .run();
  } else {
    db.insert(syncState)
      .values({ id: randomUUIDv7(), provider: "google", lastSyncAt: now })
      .run();
  }

  console.log(
    `[sync] Google Calendar 동기화 완료: +${result.added} 추가, ~${result.updated} 업데이트, ↑${result.pushed} 구글 푸시${result.errors.length ? `, ${result.errors.length} 에러` : ""}`,
  );

  return result;
}
