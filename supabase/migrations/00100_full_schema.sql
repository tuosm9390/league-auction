-- 00100_full_schema.sql
-- 전면 재작성용 통합 스키마 (기존 00001~00011 대체)
-- Broadcast-primary 아키텍처 기반
--
-- ⚠️ Supabase SQL Editor에서 기존 테이블 DROP 후 실행:
--   DROP TABLE IF EXISTS messages, bids, players, teams, rooms, auction_archives CASCADE;
--   DROP FUNCTION IF EXISTS award_player_atomic;
--   DROP PUBLICATION IF EXISTS supabase_realtime;
--
-- 이후 이 파일 실행 → 00101_award_player_atomic.sql 실행

-- ── 확장 ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 테이블 생성 ──

CREATE TABLE rooms (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT        NOT NULL,
  total_teams      INTEGER     NOT NULL DEFAULT 5,
  base_point       INTEGER     NOT NULL DEFAULT 1000,
  members_per_team INTEGER     NOT NULL DEFAULT 5,
  timer_ends_at    TIMESTAMPTZ,
  current_player_id UUID,
  organizer_token  UUID        NOT NULL DEFAULT uuid_generate_v4(),
  viewer_token     UUID        NOT NULL DEFAULT uuid_generate_v4(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teams (
  id                 UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id            UUID    REFERENCES rooms(id) ON DELETE CASCADE,
  name               TEXT    NOT NULL,
  point_balance      INTEGER NOT NULL,
  leader_token       UUID    NOT NULL DEFAULT uuid_generate_v4(),
  leader_name        TEXT,
  leader_position    TEXT,
  leader_description TEXT,
  captain_points     INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, name)
);

CREATE TABLE players (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id       UUID    REFERENCES rooms(id) ON DELETE CASCADE,
  name          TEXT    NOT NULL,
  tier          TEXT    NOT NULL,
  main_position TEXT,
  sub_position  TEXT,
  status        TEXT    NOT NULL DEFAULT 'WAITING',  -- WAITING | IN_AUCTION | SOLD | UNSOLD
  team_id       UUID    REFERENCES teams(id) ON DELETE SET NULL,
  sold_price    INTEGER,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bids (
  id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id    UUID    REFERENCES rooms(id) ON DELETE CASCADE,
  player_id  UUID    REFERENCES players(id) ON DELETE CASCADE,
  team_id    UUID    REFERENCES teams(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,  -- ORGANIZER | LEADER | VIEWER | SYSTEM | NOTICE
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auction_archives (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id         UUID        NOT NULL,
  room_name       TEXT        NOT NULL,
  room_created_at TIMESTAMPTZ NOT NULL,
  closed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result_snapshot JSONB       NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── REPLICA IDENTITY FULL (처음부터 설정 — 재작성 후 초기화 기준) ──
ALTER TABLE rooms    REPLICA IDENTITY FULL;
ALTER TABLE teams    REPLICA IDENTITY FULL;
ALTER TABLE players  REPLICA IDENTITY FULL;
ALTER TABLE bids     REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;

-- ── supabase_realtime publication ──
-- (Supabase가 자동 생성한 publication이 이미 있으면 ADD TABLE만 실행)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE rooms, teams, players, bids, messages;
  ELSE
    ALTER PUBLICATION supabase_realtime ADD TABLE rooms, teams, players, bids, messages;
  END IF;
END $$;

-- ── RLS: anon SELECT 전면 허용, 쓰기는 service_role 전용 ──
-- (service_role은 RLS를 우회하므로 Server Actions에서 INSERT/UPDATE/DELETE 가능)

ALTER TABLE rooms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE players          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids             ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select" ON rooms            FOR SELECT USING (true);
CREATE POLICY "anon_select" ON teams            FOR SELECT USING (true);
CREATE POLICY "anon_select" ON players          FOR SELECT USING (true);
CREATE POLICY "anon_select" ON bids             FOR SELECT USING (true);
CREATE POLICY "anon_select" ON messages         FOR SELECT USING (true);
CREATE POLICY "anon_select" ON auction_archives FOR SELECT USING (true);
