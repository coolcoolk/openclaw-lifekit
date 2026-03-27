import { Hono } from "hono";
import { syncGoogleCalendar } from "../services/googleCalendarSync";

export const calendarRoutes = new Hono();

// GET /api/calendar/sync — 수동 동기화 트리거
calendarRoutes.get("/sync", async (c) => {
  try {
    const result = await syncGoogleCalendar();
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 하위 호환: 기존 calendar/events 엔드포인트는 tasks API로 리다이렉트
// CalendarPage가 tasks API를 직접 사용하도록 변경됨
