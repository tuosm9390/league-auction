작성일: 2026-03-05 15:52:00
작성자: Antigravity

# Database

이 문서는 League Auction 프로젝트의 Supabase 데이터베이스 스키마와 마이그레이션 정책을 정의합니다.

## Database Schema (6 tables)

All tables have open anon RLS policies (SELECT/INSERT/UPDATE all open). Must have `REPLICA IDENTITY FULL` set and be in the `supabase_realtime` publication for realtime filters to work (migration `00003`).

Migrations must be run manually in Supabase SQL Editor (not via CLI).

- **rooms**: id, name, total_teams, base_point, members_per_team, timer_ends_at, current_player_id, organizer_token, viewer_token
  - Note: `order_public` column was added in `00002` but is no longer used in UI
- **teams**: id, room_id, name, point_balance, leader_token, leader_name, leader_position, leader_description, captain_points
- **players**: id, room_id, name, tier, main_position, sub_position, status (`WAITING`/`IN_AUCTION`/`SOLD`/`UNSOLD`), team_id, sold_price, description
- **bids**: id, room_id, player_id, team_id, amount, created_at
- **messages**: id, room_id, sender_name, sender_role (`ORGANIZER`/`LEADER`/`VIEWER`/`SYSTEM`/`NOTICE`), content, created_at
- **auction_archives**: id, room_id, room_name, room_created_at, closed_at, result_snapshot (JSONB). Stores permanent post-auction results.
