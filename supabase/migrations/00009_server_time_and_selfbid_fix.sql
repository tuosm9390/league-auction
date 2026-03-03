-- 00009_server_time_and_selfbid_fix.sql

-- 1. 서버 시간 조회 함수 (클라이언트-서버 시계 차이 보정용)
-- 클라이언트가 서버의 현재 시간을 ms 단위로 조회하여 시계 오프셋을 계산한다.
CREATE OR REPLACE FUNCTION get_server_time()
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object('now', floor(extract(epoch from now()) * 1000));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. place_bid_secure RPC 업데이트: 셀프 비딩(동일 팀 재입찰) 방지 로직 추가
CREATE OR REPLACE FUNCTION place_bid_secure(
  p_room_id UUID,
  p_player_id UUID,
  p_team_id UUID,
  p_amount INTEGER,
  p_extend_threshold_ms INTEGER DEFAULT 5000,
  p_extend_duration_ms INTEGER DEFAULT 5000
) RETURNS JSONB AS $$
DECLARE
  v_current_balance INTEGER;
  v_highest_bid INTEGER;
  v_top_bidder_team_id UUID;
  v_timer_ends_at TIMESTAMPTZ;
  v_current_player_id UUID;
  v_members_per_team INTEGER;
  v_sold_count INTEGER;
  v_remaining_ms DOUBLE PRECISION;
BEGIN
  -- 1. 방 상태 확인 (Row Lock 적용)
  SELECT timer_ends_at, current_player_id, members_per_team
  INTO v_timer_ends_at, v_current_player_id, v_members_per_team
  FROM rooms WHERE id = p_room_id FOR UPDATE;

  IF v_timer_ends_at IS NULL OR v_timer_ends_at < NOW() THEN
    RETURN jsonb_build_object('error', '경매가 진행 중이지 않거나 이미 종료되었습니다.');
  END IF;

  IF v_current_player_id IS NULL OR v_current_player_id <> p_player_id THEN
    RETURN jsonb_build_object('error', '현재 경매 중인 선수가 아닙니다.');
  END IF;

  -- 2. 팀 정보 및 잔액 확인 (Row Lock 적용)
  SELECT point_balance INTO v_current_balance
  FROM teams WHERE id = p_team_id FOR UPDATE;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object('error', '포인트가 부족합니다.');
  END IF;

  -- 3. 팀 정원 확인
  SELECT count(*) INTO v_sold_count
  FROM players WHERE team_id = p_team_id AND status = 'SOLD';

  IF v_sold_count >= (v_members_per_team - 1) THEN
    RETURN jsonb_build_object('error', '팀 인원이 가득 찼습니다.');
  END IF;

  -- 4. 최고 입찰가 및 최고 입찰팀 확인
  SELECT MAX(amount) INTO v_highest_bid
  FROM bids WHERE player_id = p_player_id;

  IF v_highest_bid IS NOT NULL AND p_amount <= v_highest_bid THEN
    RETURN jsonb_build_object('error', '현재 최고가보다 높은 금액을 입력해야 합니다.');
  END IF;

  -- 4-1. 셀프 비딩 방지: 이미 최고 입찰 중인 팀이 다시 입찰하는 것 방지
  SELECT team_id INTO v_top_bidder_team_id
  FROM bids WHERE player_id = p_player_id ORDER BY amount DESC LIMIT 1;

  IF v_top_bidder_team_id IS NOT NULL AND v_top_bidder_team_id = p_team_id THEN
    RETURN jsonb_build_object('error', '이미 최고 입찰 중인 팀입니다. 다른 팀의 입찰을 기다리세요.');
  END IF;

  -- 5. 입찰 기록 삽입
  INSERT INTO bids (room_id, player_id, team_id, amount)
  VALUES (p_room_id, p_player_id, p_team_id, p_amount);

  -- 6. 타이머 연장 체크
  v_remaining_ms := EXTRACT(EPOCH FROM (v_timer_ends_at - NOW())) * 1000;
  IF v_remaining_ms <= p_extend_threshold_ms THEN
    UPDATE rooms
    SET timer_ends_at = NOW() + (p_extend_duration_ms || ' milliseconds')::INTERVAL
    WHERE id = p_room_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'amount', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
