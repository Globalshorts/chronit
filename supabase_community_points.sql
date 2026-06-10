-- ============================================================
-- 크로닛 커뮤니티 + 포인트 + 출석(리텐션) + 기프티콘 교환소
-- Supabase project: oxygqtbdpnxxcgzwdlzi
-- 적용 마이그레이션: points_core / board_system / attendance_and_gifticon
-- (이미 운영 DB에 apply 완료 — 본 파일은 형상관리용 기록)
-- ============================================================

-- ── 포인트 원장 (크레딧과 완전 분리) ──────────────────────────
create table if not exists public.point_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null,
  reason text not null default '변동',
  ref_type text, ref_id text,
  balance_after int,
  created_at timestamptz not null default now()
);
create index if not exists point_tx_user_created_idx on public.point_transactions(user_id, created_at desc);
create index if not exists point_tx_user_reason_idx  on public.point_transactions(user_id, reason, created_at desc);

-- 적립 규칙 (관리자 조정 가능, daily_cap=하루 적립 횟수, 0=무제한)
create table if not exists public.point_rules (
  reason text primary key, points int not null default 0,
  daily_cap int not null default 0, label text not null default '', active boolean not null default true
);
insert into public.point_rules(reason, points, daily_cap, label) values
  ('attendance',10,1,'출석체크'), ('post',30,3,'게시글 작성'), ('comment',5,10,'댓글 작성'),
  ('like_received',2,30,'추천 받기'), ('attendance_streak7',50,0,'7일 연속출석 보너스')
on conflict (reason) do nothing;

alter table public.profiles add column if not exists nickname text;
create unique index if not exists profiles_nickname_lower_key on public.profiles(lower(nickname)) where nickname is not null;

-- 게시판
create table if not exists public.board_posts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_nickname text not null,
  category text not null default 'free' check (category in ('free','show','qna')),
  title text not null, body text not null,
  like_count int not null default 0, comment_count int not null default 0, view_count int not null default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists board_posts_list_idx on public.board_posts(category, created_at desc) where is_deleted = false;

create table if not exists public.board_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.board_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_nickname text not null, body text not null,
  is_deleted boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists board_comments_post_idx on public.board_comments(post_id, created_at) where is_deleted = false;

create table if not exists public.board_likes (
  post_id bigint not null references public.board_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (post_id, user_id)
);

-- 출석(리텐션)
create table if not exists public.attendance_checks (
  user_id uuid not null references auth.users(id) on delete cascade,
  check_date date not null, streak int not null default 1,
  created_at timestamptz not null default now(), primary key (user_id, check_date)
);

-- 기프티콘
create table if not exists public.gifticons (
  id bigint generated always as identity primary key,
  name text not null, brand text not null default '', image_url text not null default '',
  point_cost int not null, stock int, active boolean not null default true,
  sort_order int not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.gifticon_redemptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  gifticon_id bigint references public.gifticons(id),
  gifticon_name text not null default '', point_cost int not null,
  status text not null default 'requested' check (status in ('requested','sent','failed','rejected')),
  recipient_phone text, provider text, provider_order_id text, coupon_code text, coupon_url text, note text,
  created_at timestamptz not null default now(), sent_at timestamptz
);
create index if not exists redemptions_user_idx   on public.gifticon_redemptions(user_id, created_at desc);
create index if not exists redemptions_status_idx on public.gifticon_redemptions(status, created_at desc);

-- RLS / RPC 정의는 적용된 마이그레이션 참고:
--   _award_points, _award_capped, get_my_points_rpc, set_nickname_rpc,
--   board_create_post_rpc, board_create_comment_rpc, board_toggle_like_rpc, increment_post_view_rpc,
--   attendance_check_rpc, redeem_gifticon_rpc, is_admin
-- (모두 SECURITY DEFINER, search_path=public,pg_temp / 적립·차감은 RPC로만)
