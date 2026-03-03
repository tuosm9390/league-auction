-- 00010_rls_policies.sql
-- RLS 정책 재설정: anon key는 SELECT만 허용, INSERT/UPDATE/DELETE는 service_role 전용
-- (Server Actions에서 getServerClient()가 service_role key 사용 → RLS 우회 → 정상 동작)
--
-- ⚠️ Supabase SQL Editor에서 수동 실행 필요

-- ──────────────── rooms ────────────────
DROP POLICY IF EXISTS "anon_select" ON rooms;
DROP POLICY IF EXISTS "Enable read access for all users" ON rooms;
DROP POLICY IF EXISTS "Allow all" ON rooms;
DROP POLICY IF EXISTS "Enable insert for all" ON rooms;
DROP POLICY IF EXISTS "Enable update for all" ON rooms;
DROP POLICY IF EXISTS "Enable delete for all" ON rooms;

CREATE POLICY "anon_select" ON rooms
  FOR SELECT USING (true);

-- ──────────────── teams ────────────────
DROP POLICY IF EXISTS "anon_select" ON teams;
DROP POLICY IF EXISTS "Enable read access for all users" ON teams;
DROP POLICY IF EXISTS "Allow all" ON teams;
DROP POLICY IF EXISTS "Enable insert for all" ON teams;
DROP POLICY IF EXISTS "Enable update for all" ON teams;
DROP POLICY IF EXISTS "Enable delete for all" ON teams;

CREATE POLICY "anon_select" ON teams
  FOR SELECT USING (true);

-- ──────────────── players ────────────────
DROP POLICY IF EXISTS "anon_select" ON players;
DROP POLICY IF EXISTS "Enable read access for all users" ON players;
DROP POLICY IF EXISTS "Allow all" ON players;
DROP POLICY IF EXISTS "Enable insert for all" ON players;
DROP POLICY IF EXISTS "Enable update for all" ON players;
DROP POLICY IF EXISTS "Enable delete for all" ON players;

CREATE POLICY "anon_select" ON players
  FOR SELECT USING (true);

-- ──────────────── bids ────────────────
DROP POLICY IF EXISTS "anon_select" ON bids;
DROP POLICY IF EXISTS "Enable read access for all users" ON bids;
DROP POLICY IF EXISTS "Allow all" ON bids;
DROP POLICY IF EXISTS "Enable insert for all" ON bids;
DROP POLICY IF EXISTS "Enable update for all" ON bids;
DROP POLICY IF EXISTS "Enable delete for all" ON bids;

CREATE POLICY "anon_select" ON bids
  FOR SELECT USING (true);

-- ──────────────── messages ────────────────
DROP POLICY IF EXISTS "anon_select" ON messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
DROP POLICY IF EXISTS "Allow all" ON messages;
DROP POLICY IF EXISTS "Enable insert for all" ON messages;
DROP POLICY IF EXISTS "Enable update for all" ON messages;
DROP POLICY IF EXISTS "Enable delete for all" ON messages;

CREATE POLICY "anon_select" ON messages
  FOR SELECT USING (true);

-- ──────────────── auction_archives ────────────────
DROP POLICY IF EXISTS "anon_select" ON auction_archives;
DROP POLICY IF EXISTS "Enable read access for all users" ON auction_archives;
DROP POLICY IF EXISTS "Allow all" ON auction_archives;
DROP POLICY IF EXISTS "Enable insert for all" ON auction_archives;
DROP POLICY IF EXISTS "Enable update for all" ON auction_archives;
DROP POLICY IF EXISTS "Enable delete for all" ON auction_archives;

CREATE POLICY "anon_select" ON auction_archives
  FOR SELECT USING (true);
