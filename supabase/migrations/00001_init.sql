-- 리그오브레전드 경매 시스템 Schema
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Rooms Table (경매방)
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  total_teams INTEGER NOT NULL DEFAULT 5,
  base_point INTEGER NOT NULL DEFAULT 1000,
  timer_ends_at TIMESTAMPTZ, -- 진행 중인 경매 마감 시간 (모두 동기화)
  current_player_id UUID, -- 현재 경매 진행 중인 플레이어
  organizer_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  viewer_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Teams Table (참가 팀 및 팀장 데이터)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  point_balance INTEGER NOT NULL,
  leader_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, name)
);

-- 3. Players Table (경매 대상자 - 롤 유저 풀)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier TEXT NOT NULL,
  main_position TEXT,
  sub_position TEXT,
  status TEXT NOT NULL DEFAULT 'WAITING', -- WAITING, IN_AUCTION, SOLD
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  sold_price INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bids Table (입찰 로그 내역)
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Messages Table (실시간 채팅)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL, -- ORGANIZER, LEADER, VIEWER
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS(Row Level Security) 비활성화 혹은 기본 허용 배포 (초기 간단한 토큰 인증을 위해)
-- 현재는 토큰을 URL QueryParams 로 관리하므로 모두 Select/Insert/Update 개방하고 애플리케이션 레벨에서 차단함
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select" ON rooms FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update" ON rooms FOR UPDATE USING (true);

CREATE POLICY "Allow anon select" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update" ON teams FOR UPDATE USING (true);

CREATE POLICY "Allow anon select" ON players FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update" ON players FOR UPDATE USING (true);

CREATE POLICY "Allow anon select" ON bids FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON bids FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon select" ON messages FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON messages FOR INSERT WITH CHECK (true);
