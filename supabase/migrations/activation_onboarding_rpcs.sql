-- 활성화 온보딩(#1)에 필요한 쓰기 경로.
-- profiles 에는 UPDATE RLS 정책이 없어서 클라이언트 update 는 0행에 적용된다 →
-- onboarded_at / kakao_opt_in 도 반드시 SECURITY DEFINER RPC 로만 쓴다.
--
-- 기존 complete_onboarding_rpc() 는 onboarded 만 true 로 바꾸고 onboarded_at 은 건드리지 않는다.
-- 그래서 완료 시각을 남길 함수를 따로 둔다(기존 함수는 다른 곳에서 쓰므로 그대로 둠).

-- 1) 활성화 완료 — onboarded_at 을 한 번만 기록한다(재호출해도 최초 시각 유지)
create or replace function public.complete_activation_rpc()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', '로그인이 필요합니다');
  end if;
  update public.profiles
     set onboarded    = true,
         onboarded_at = coalesce(onboarded_at, now())
   where id = auth.uid();
  return jsonb_build_object(
    'ok', true,
    'onboarded_at', (select onboarded_at from public.profiles where id = auth.uid())
  );
end;
$$;

revoke all on function public.complete_activation_rpc() from public, anon;
grant execute on function public.complete_activation_rpc() to authenticated;

-- 2) 카카오 채널 추가 동의 기록
--    주의: 카카오 JS SDK 의 addChannel 은 실제 추가 완료를 콜백으로 알려주지 않는다.
--    따라서 이 값은 '추가 버튼을 눌렀다'는 의사표시이지 채널 친구 수와 일치하지 않는다.
create or replace function public.set_kakao_opt_in_rpc(p_opt_in boolean default true)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', '로그인이 필요합니다');
  end if;
  update public.profiles set kakao_opt_in = coalesce(p_opt_in, true) where id = auth.uid();
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.set_kakao_opt_in_rpc(boolean) from public, anon;
grant execute on function public.set_kakao_opt_in_rpc(boolean) to authenticated;

-- 3) 기존 회원 백필 — 이거 없이 배포하면 onboarded_at 이 null 인 "모든 기존 회원"에게
--    강제 온보딩이 뜬다. 이미 가입을 마친 사람은 가입 시각으로 채워 대상에서 제외한다.
update public.profiles
   set onboarded_at = coalesce(onboarded_at, created_at, now())
 where onboarded_at is null
   and onboarded is true;
