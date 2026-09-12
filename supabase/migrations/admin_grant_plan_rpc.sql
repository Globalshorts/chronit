-- 2026-09-12 · 관리자 구독 부여를 위한 admin 게이트 래퍼 + 권한 하드닝
--
-- 배경
--  · admin_grant_subscription_rpc 는 plans.max_credits 로 credits_used 를 상쇄해
--    '기능만' 부여한다 → Finds 플랜(finds30/100/300)에는 맞지 않는다.
--  · Finds 플랜은 grant_finds_sub_rpc 로 지급해야 한다(toss-confirm 엣지펑션 grant() 와 동일).
--  · 그런데 grant_finds_sub_rpc / grant_finds_pack_rpc 에는 권한 검사가 없는데
--    anon·authenticated 에 EXECUTE 가 열려 있다 → 로그인 유저 누구나 자기 구독을
--    finds300 으로 올릴 수 있다. 아래에서 회수한다(서버는 service_role 로 호출하므로 영향 없음).
--
-- 적용:  supabase db push   또는 SQL 에디터에 그대로 실행

create or replace function public.admin_grant_plan_rpc(
  p_target_user_id uuid,
  p_plan text,
  p_days integer default 30,
  p_amount numeric default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_res jsonb;
begin
  if (select role from subscriptions where user_id = auth.uid()) is distinct from 'super_admin' then
    return jsonb_build_object('ok', false, 'error', '권한 없음');
  end if;
  if p_plan is null or p_plan = '' then
    return jsonb_build_object('ok', false, 'error', '플랜을 선택하세요');
  end if;

  if p_plan in ('finds30','finds100','finds300') then
    v_res := public.grant_finds_sub_rpc(p_target_user_id, p_plan, coalesce(p_days, 30), p_amount, 'monthly');
    -- 관리자 수동 지급도 결제금액이 있으면 파트너 적립을 태운다
    -- (admin_grant_subscription_rpc 와 동일 동작)
    if p_amount is not null and p_amount > 0 then
      begin
        v_res := v_res || jsonb_build_object('accrual',
          public.accrue_partner_commission_rpc(
            p_target_user_id,
            'grant_' || p_target_user_id::text || '_' || floor(extract(epoch from now()))::bigint::text,
            p_amount, p_plan, 7));
      exception when others then null;
      end;
    end if;
    return v_res;
  end if;

  return public.admin_grant_subscription_rpc(p_target_user_id, p_plan, coalesce(p_days, 30), p_amount);
end $$;

revoke all on function public.admin_grant_plan_rpc(uuid, text, integer, numeric) from public, anon;
grant execute on function public.admin_grant_plan_rpc(uuid, text, integer, numeric) to authenticated, service_role;

-- 권한 검사가 없는 지급 RPC 는 서버(service_role)와 위 래퍼에서만 호출되도록 회수
revoke execute on function public.grant_finds_sub_rpc(uuid, text, integer, numeric) from public, anon, authenticated;
revoke execute on function public.grant_finds_sub_rpc(uuid, text, integer, numeric, text) from public, anon, authenticated;
revoke execute on function public.grant_finds_pack_rpc(uuid, integer) from public, anon, authenticated;

-- 표기 통일: plans.name 에 남아 있는 옛 이름 정리 (프론트는 planLabels.js 를 쓰지만 DB도 맞춰둔다)
update public.plans set name = '프로'     where id = 'finds100' and name <> '프로';
update public.plans set name = '비즈니스' where id = 'finds300' and name <> '비즈니스';
