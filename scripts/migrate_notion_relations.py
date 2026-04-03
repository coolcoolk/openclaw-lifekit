#!/usr/bin/env python3
"""
Notion → LifeKit 마이그레이션 스크립트
- 관계 DB → relations 테이블
- 약속 DB → tasks 테이블 (캘린더 이벤트)
"""

import argparse
import json
import sqlite3
import sys
import urllib.request
import urllib.error
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

# ─── Config ───────────────────────────────────────────────────────────────────
NOTION_TOKEN = "ntn_x35254825494WtDmx2cdnThKpv1GwJfuot5pMFLstwZfxN"
RELATIONS_DB_ID = "1790d222-9835-80c3-8377-fe70860cdaa2"
APPOINTMENTS_DB_ID = "1790d222-9835-8070-81b7-d7602629b6d8"
DB_PATH = "/Users/coolhouette/Desktop/dev/github/openclaw-lifekit/packages/server/data/lifekit.db"
NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"


# ─── Notion helpers ──────────────────────────────────────────────────────────
def notion_request(endpoint: str, body: Optional[dict] = None) -> dict:
    url = f"{NOTION_API}{endpoint}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {NOTION_TOKEN}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
        },
        method="POST" if data else "GET",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def query_all_pages(database_id: str) -> List[dict]:
    """Paginate through all pages in a Notion database."""
    pages = []
    body: dict = {"page_size": 100}
    while True:
        result = notion_request(f"/databases/{database_id}/query", body)
        pages.extend(result.get("results", []))
        if not result.get("has_more"):
            break
        body["start_cursor"] = result["next_cursor"]
    return pages


# ─── Property extractors ────────────────────────────────────────────────────
def get_title(props: dict, key: str) -> str:
    prop = props.get(key)
    if not prop or prop["type"] != "title":
        return ""
    return "".join(t.get("plain_text", "") for t in prop.get("title", []))


def get_rich_text(props: dict, key: str) -> str:
    prop = props.get(key)
    if not prop or prop["type"] != "rich_text":
        return ""
    return "".join(t.get("plain_text", "") for t in prop.get("rich_text", []))


def get_select(props: dict, key: str) -> Optional[str]:
    prop = props.get(key)
    if not prop or prop["type"] != "select" or not prop.get("select"):
        return None
    return prop["select"].get("name")


def get_multi_select(props: dict, key: str) -> List[str]:
    prop = props.get(key)
    if not prop or prop["type"] != "multi_select":
        return []
    return [s["name"] for s in prop.get("multi_select", [])]


def get_date(props: dict, key: str) -> Optional[str]:
    prop = props.get(key)
    if not prop:
        return None
    # Could be "date" or "rollup" type
    if prop["type"] == "date":
        if not prop.get("date"):
            return None
        return prop["date"].get("start")
    if prop["type"] == "rollup":
        rollup = prop.get("rollup", {})
        # rollup can be array of dates or a single value
        if rollup.get("type") == "date" and rollup.get("date"):
            return rollup["date"].get("start")
        if rollup.get("type") == "array":
            for item in rollup.get("array", []):
                if item.get("type") == "date" and item.get("date"):
                    return item["date"].get("start")
    return None


def get_checkbox(props: dict, key: str) -> bool:
    prop = props.get(key)
    if not prop or prop["type"] != "checkbox":
        return False
    return prop.get("checkbox", False)


def get_relation_ids(props: dict, key: str) -> List[str]:
    prop = props.get(key)
    if not prop or prop["type"] != "relation":
        return []
    return [r["id"] for r in prop.get("relation", [])]


def normalize_date(d: Optional[str]) -> Optional[str]:
    """Extract YYYY-MM-DD from an ISO date string."""
    if not d:
        return None
    return d[:10]  # handles "2024-01-15" and "2024-01-15T00:00:00.000+09:00"


# ─── Migration ───────────────────────────────────────────────────────────────
def migrate(dry_run: bool = False):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    cur = conn.cursor()

    stats = {
        "relations_total": 0,
        "relations_inserted": 0,
        "relations_skipped": 0,
        "relations_errors": 0,
        "appointments_total": 0,
        "appointments_inserted": 0,
        "appointments_skipped": 0,
        "appointments_errors": 0,
    }

    # ── 1. 관계 DB ────────────────────────────────────────────────────────
    print("📥 Fetching 관계 DB from Notion...")
    relation_pages = query_all_pages(RELATIONS_DB_ID)
    stats["relations_total"] = len(relation_pages)
    print(f"   Found {len(relation_pages)} people")

    # Build notion_page_id → lifekit_id map (for linking appointments later)
    notion_to_lifekit: Dict[str, str] = {}

    # Check existing relations (by notion page id stored in memo)
    cur.execute("SELECT id, memo FROM relations")
    existing_relations: Dict[str, str] = {}  # notion_page_id → lifekit_id
    for row in cur.fetchall():
        rid, memo = row
        if memo:
            try:
                m = json.loads(memo)
                if "notion_page_id" in m:
                    existing_relations[m["notion_page_id"]] = rid
            except (json.JSONDecodeError, TypeError):
                pass

    for page in relation_pages:
        try:
            page_id = page["id"]
            props = page.get("properties", {})

            # Check if already migrated
            if page_id in existing_relations:
                notion_to_lifekit[page_id] = existing_relations[page_id]
                stats["relations_skipped"] += 1
                continue

            name = get_title(props, "이름")
            if not name:
                stats["relations_errors"] += 1
                continue

            relation_type = get_select(props, "관계")
            birthday = normalize_date(get_date(props, "생일"))
            contact = get_rich_text(props, "연락처")
            residence = get_rich_text(props, "거주지")
            mbti = get_multi_select(props, "MBTI")
            last_appointment = normalize_date(get_date(props, "마지막 약속"))
            sogaeting = get_checkbox(props, "소개팅풀")

            # Build memo as JSON
            memo_data = {"notion_page_id": page_id}
            if contact:
                memo_data["연락처"] = contact
            if residence:
                memo_data["거주지"] = residence
            if mbti:
                memo_data["MBTI"] = mbti
            if sogaeting:
                memo_data["소개팅풀"] = True

            lifekit_id = str(uuid.uuid4())
            notion_to_lifekit[page_id] = lifekit_id

            if dry_run:
                print(f"   [DRY] Would insert relation: {name} ({relation_type})")
            else:
                cur.execute(
                    """INSERT INTO relations (id, name, relation_type, birthday, memo, last_met_at, meeting_count, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)""",
                    (lifekit_id, name, relation_type, birthday, json.dumps(memo_data, ensure_ascii=False), last_appointment, now, now),
                )
            stats["relations_inserted"] += 1

        except Exception as e:
            print(f"   ⚠️ Error processing relation: {e}", file=sys.stderr)
            stats["relations_errors"] += 1

    if not dry_run:
        conn.commit()
    print(f"   ✅ Relations: {stats['relations_inserted']} inserted, {stats['relations_skipped']} skipped, {stats['relations_errors']} errors")

    # ── 2. 약속 DB ────────────────────────────────────────────────────────
    print("\n📥 Fetching 약속 DB from Notion...")
    appointment_pages = query_all_pages(APPOINTMENTS_DB_ID)
    stats["appointments_total"] = len(appointment_pages)
    print(f"   Found {len(appointment_pages)} appointments")

    # Check existing tasks by external_id
    cur.execute("SELECT external_id FROM tasks WHERE source = 'notion_migration' AND external_id IS NOT NULL")
    existing_tasks = {row[0] for row in cur.fetchall()}

    for page in appointment_pages:
        try:
            page_id = page["id"]

            if page_id in existing_tasks:
                stats["appointments_skipped"] += 1
                continue

            props = page.get("properties", {})
            title = get_title(props, "이름")
            if not title:
                stats["appointments_errors"] += 1
                continue

            date_str = get_date(props, "날짜")
            start_at = date_str if date_str else None
            location = get_rich_text(props, "위치")
            purpose = get_select(props, "목적")
            summary = get_rich_text(props, "요약")
            related_ids = get_relation_ids(props, "누구랑?")

            # Build description
            desc_parts = []
            if summary:
                desc_parts.append(summary)
            if purpose:
                desc_parts.append(f"목적: {purpose}")
            description = "\n".join(desc_parts) if desc_parts else None

            # Map relation notion IDs → lifekit IDs
            lifekit_relation_ids = [notion_to_lifekit[rid] for rid in related_ids if rid in notion_to_lifekit]
            relation_ids_str = json.dumps(lifekit_relation_ids) if lifekit_relation_ids else None

            # Determine if all-day
            all_day = 1 if (start_at and len(start_at) == 10) else 0

            task_id = str(uuid.uuid4())

            if dry_run:
                print(f"   [DRY] Would insert appointment: {title} ({start_at})")
            else:
                cur.execute(
                    """INSERT INTO tasks (id, title, start_at, location, description, source, external_id, all_day, relation_ids, status, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, 'notion_migration', ?, ?, ?, 'done', ?, ?)""",
                    (task_id, title, start_at, location or None, description, page_id, all_day, relation_ids_str, now, now),
                )
            stats["appointments_inserted"] += 1

        except Exception as e:
            print(f"   ⚠️ Error processing appointment: {e}", file=sys.stderr)
            stats["appointments_errors"] += 1

    if not dry_run:
        conn.commit()
    conn.close()

    # ── Summary ───────────────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("📊 마이그레이션 결과 요약")
    print("=" * 50)
    if dry_run:
        print("⚠️  DRY RUN — 실제 DB 변경 없음")
    print(f"\n👤 관계 (Relations):")
    print(f"   총: {stats['relations_total']}")
    print(f"   삽입: {stats['relations_inserted']}")
    print(f"   스킵 (중복): {stats['relations_skipped']}")
    print(f"   에러: {stats['relations_errors']}")
    print(f"\n📅 약속 (Appointments → Tasks):")
    print(f"   총: {stats['appointments_total']}")
    print(f"   삽입: {stats['appointments_inserted']}")
    print(f"   스킵 (중복): {stats['appointments_skipped']}")
    print(f"   에러: {stats['appointments_errors']}")
    print("=" * 50)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Notion → LifeKit 마이그레이션")
    parser.add_argument("--dry-run", action="store_true", help="실제 DB 변경 없이 미리보기")
    args = parser.parse_args()
    migrate(dry_run=args.dry_run)
