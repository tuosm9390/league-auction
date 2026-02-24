-- Supabase 실시간 구독을 위해 REPLICA IDENTITY FULL 설정
-- (UPDATE/DELETE 이벤트에서 필터링이 제대로 동작하려면 필요)
ALTER TABLE rooms    REPLICA IDENTITY FULL;
ALTER TABLE teams    REPLICA IDENTITY FULL;
ALTER TABLE players  REPLICA IDENTITY FULL;
ALTER TABLE bids     REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;

-- supabase_realtime 퍼블리케이션에 테이블 추가
-- (이미 추가된 경우 오류 발생 가능 - Supabase 대시보드에서 직접 확인)
ALTER PUBLICATION supabase_realtime ADD TABLE rooms, teams, players, bids, messages;
