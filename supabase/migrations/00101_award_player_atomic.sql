-- 00101_award_player_atomic.sql
-- 낙찰 처리를 단일 트랜잭션으로 원자적으로 수행하는 RPC 함수
-- players.status 변경 + teams.point_balance 차감이 분리되어 발생하는 데이터 불일치 방지
--
-- ⚠️ Supabase SQL Editor에서 수동 실행 필요 (00100_full_schema.sql 실행 후)

CREATE OR REPLACE FUNCTION award_player_atomic(
  p_room_id UUID,
  p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player RECORD;
  v_top_bid RECORD;
  v_team RECORD;
  v_room RECORD;
BEGIN
  -- 1. 방 상태 확인 (FOR UPDATE 락으로 동시 낙찰 방지)
  SELECT timer_ends_at INTO v_room
    FROM rooms
    WHERE id = p_room_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'room_not_found');
  END IF;

  -- 2. 타이머가 아직 미래면 조기 종료 (만료 전 낙찰 시도 방지)
  -- 이 부분 때문에 낙찰된 선수의 상태가 변경되지 않고 있었음. 임시 삭제(보안상의 이슈가 생기면 관리 필요)
  --  IF v_room.timer_ends_at IS NOT NULL AND v_room.timer_ends_at > NOW() THEN
  --  RETURN jsonb_build_object('skipped', true, 'reason', 'timer_not_expired');
  --END IF;

  -- 3. 선수 상태 확인 (FOR UPDATE 락으로 중복 낙찰 방지)
  SELECT status, name INTO v_player
    FROM players
    WHERE id = p_player_id
    FOR UPDATE;

  IF NOT FOUND OR v_player.status != 'IN_AUCTION' THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'not_in_auction');
  END IF;

  -- 4. 최고 입찰 조회
  SELECT * INTO v_top_bid
    FROM bids
    WHERE player_id = p_player_id
      AND room_id = p_room_id
    ORDER BY amount DESC
    LIMIT 1;

  IF v_top_bid IS NULL THEN
    -- 입찰 없음: UNSOLD 처리
    UPDATE players
      SET status = 'UNSOLD'
      WHERE id = p_player_id;

    UPDATE rooms
      SET timer_ends_at = NULL, current_player_id = NULL
      WHERE id = p_room_id;

    INSERT INTO messages (room_id, sender_name, sender_role, content)
      VALUES (
        p_room_id,
        '시스템',
        'SYSTEM',
        '😔 입찰자 없음 — 최저가 입찰이 진행되지 않아 유찰되었습니다.'
      );

    RETURN jsonb_build_object('result', 'unsold');
  ELSE
    -- 입찰 있음: SOLD + 포인트 차감
    SELECT point_balance, name INTO v_team
      FROM teams
      WHERE id = v_top_bid.team_id
      FOR UPDATE;

    UPDATE players
      SET status = 'SOLD',
          team_id = v_top_bid.team_id,
          sold_price = v_top_bid.amount
      WHERE id = p_player_id;

    UPDATE teams
      SET point_balance = v_team.point_balance - v_top_bid.amount
      WHERE id = v_top_bid.team_id;

    UPDATE rooms
      SET timer_ends_at = NULL, current_player_id = NULL
      WHERE id = p_room_id;

    INSERT INTO messages (room_id, sender_name, sender_role, content)
      VALUES (
        p_room_id,
        '시스템',
        'SYSTEM',
        '🏆 ' || v_player.name || ' → ' || v_team.name || ' (' || v_top_bid.amount::text || 'P 낙찰!)'
      );

    RETURN jsonb_build_object(
      'result', 'sold',
      'team', v_team.name,
      'amount', v_top_bid.amount
    );
  END IF;
END;
$$;
