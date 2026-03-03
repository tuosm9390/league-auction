-- 경매 결과 보관을 위한 auction_archives 테이블 생성 (최종 확정 스키마)
CREATE TABLE IF NOT EXISTS auction_archives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL,
  room_name TEXT NOT NULL,
  room_created_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 설정
ALTER TABLE auction_archives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select" ON auction_archives;
DROP POLICY IF EXISTS "Allow anon insert" ON auction_archives;
DROP POLICY IF EXISTS "Allow anon delete" ON auction_archives;

CREATE POLICY "Allow anon select" ON auction_archives FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON auction_archives FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon delete" ON auction_archives FOR DELETE USING (true);
