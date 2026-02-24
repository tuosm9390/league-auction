-- 방 만들기 기능 확장을 위한 필드 추가

-- rooms: 팀당 인원 수, 경매 순서 공개 여부
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS members_per_team INTEGER NOT NULL DEFAULT 5;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS order_public BOOLEAN NOT NULL DEFAULT true;

-- teams: 팀장 이름/포지션/소개/팀장 포인트
ALTER TABLE teams ADD COLUMN IF NOT EXISTS leader_name TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS leader_position TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS leader_description TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS captain_points INTEGER NOT NULL DEFAULT 0;

-- players: 선수 소개
ALTER TABLE players ADD COLUMN IF NOT EXISTS description TEXT;
