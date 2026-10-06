-- 베라 잡담(대본 세션 밖 대화)을 세션 단위로 보관: 세션 안 대화는 전부 저장, 유저당 세션 최대 100개
-- (2026-10-06 프로덕션에 적용됨 — 기록용)
create table if not exists public.vera_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vera_chat_sessions_user_updated on public.vera_chat_sessions(user_id, updated_at desc);
alter table public.vera_chat_sessions enable row level security;

create or replace function public.prune_chat_sessions(p_uid uuid, p_keep int default 100)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  delete from public.vera_chat_sessions v
  using (select id, row_number() over (order by updated_at desc, created_at desc, id desc) as rn
         from public.vera_chat_sessions where user_id = p_uid) r
  where v.id = r.id and r.rn > p_keep;
end $$;
revoke all on function public.prune_chat_sessions(uuid, int) from public, anon, authenticated;

create or replace function public.list_chat_sessions_rpc(p_limit int default 100)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'updated_at', updated_at, 'count', jsonb_array_length(messages)) order by updated_at desc)
    from (select * from public.vera_chat_sessions where user_id = v_uid order by updated_at desc limit least(greatest(p_limit,1),100)) s), '[]'::jsonb);
end $$;

create or replace function public.get_chat_session_rpc(p_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); r record;
begin
  select id, title, messages, updated_at into r from public.vera_chat_sessions where id = p_id and user_id = v_uid;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'id', r.id, 'title', r.title, 'messages', r.messages, 'updated_at', r.updated_at);
end $$;

create or replace function public.save_chat_session_rpc(p_id uuid, p_messages jsonb, p_title text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_id uuid := p_id; v_msgs jsonb := coalesce(p_messages, '[]'::jsonb);
begin
  if v_uid is null then return jsonb_build_object('ok', false); end if;
  if jsonb_typeof(v_msgs) <> 'array' then return jsonb_build_object('ok', false, 'error', 'bad_messages'); end if;
  if octet_length(v_msgs::text) > 2000000 then return jsonb_build_object('ok', false, 'error', 'too_large'); end if;
  if v_id is not null then
    update public.vera_chat_sessions set messages = v_msgs, title = coalesce(nullif(left(p_title, 40), ''), title), updated_at = clock_timestamp()
    where id = v_id and user_id = v_uid;
    if not found then v_id := null; end if;
  end if;
  if v_id is null then
    insert into public.vera_chat_sessions(user_id, title, messages, created_at, updated_at)
    values (v_uid, coalesce(left(p_title, 40), ''), v_msgs, clock_timestamp(), clock_timestamp()) returning id into v_id;
    perform public.prune_chat_sessions(v_uid, 100);
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.delete_chat_session_rpc(p_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  delete from public.vera_chat_sessions where id = p_id and user_id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.list_chat_sessions_rpc(int) to authenticated;
grant execute on function public.get_chat_session_rpc(uuid) to authenticated;
grant execute on function public.save_chat_session_rpc(uuid, jsonb, text) to authenticated;
grant execute on function public.delete_chat_session_rpc(uuid) to authenticated;
