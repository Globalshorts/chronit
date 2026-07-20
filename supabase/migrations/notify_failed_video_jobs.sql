-- 서버측 영상 생성 실패 감지 → report-error 엣지함수로 승호 이메일 (탭 종료 등 클라 미포착 보완)
-- video_jobs 실패 상태값 = 'error' (주의: 'failed' 아님). 10분마다 크론, 커서 기반 신규분만 알림.
create or replace function public.notify_failed_video_jobs()
returns void language plpgsql security definer set search_path = public as $$
declare v_cursor timestamptz; v_rows text; v_count int;
begin
  select coalesce((select value::timestamptz from app_config where key='failed_notify_cursor'), now() - interval '1 hour') into v_cursor;
  select count(*), string_agg('- ['||to_char(coalesce(updated_at,created_at),'MM-DD HH24:MI')||'] '||left(id::text,8)
      ||' / user '||left(coalesce(user_id::text,'-'),8)
      ||' / '||coalesce(nullif(error_message,''),nullif(error_detail,''),'(메시지 없음)')
      ||coalesce(' / '||nullif(product_name,''),''), E'\n' order by coalesce(updated_at,created_at))
    into v_count, v_rows
  from video_jobs where status='error' and coalesce(updated_at,created_at) > v_cursor;
  if coalesce(v_count,0) > 0 then
    perform net.http_post(
      url := 'https://oxygqtbdpnxxcgzwdlzi.supabase.co/functions/v1/report-error',
      headers := jsonb_build_object('Content-Type','application/json','apikey','<ANON_KEY>','Authorization','Bearer <ANON_KEY>'),
      body := jsonb_build_object('source','video_gen_server',
        'message','서버 감지: 영상 생성 실패 '||v_count||'건 (클라이언트 미포착 포함)',
        'stack', v_rows, 'context', jsonb_build_object('url','cron:notify_failed_video_jobs','ts',now()::text)));
  end if;
  insert into app_config(key,value,updated_at) values('failed_notify_cursor', now()::text, now())
  on conflict (key) do update set value=excluded.value, updated_at=now();
end $$;
revoke all on function public.notify_failed_video_jobs() from public, anon, authenticated;
insert into app_config(key,value,updated_at) values('failed_notify_cursor', now()::text, now())
  on conflict (key) do update set value=excluded.value, updated_at=now();
do $$ begin perform cron.unschedule('notify-failed-video-jobs'); exception when others then null; end $$;
select cron.schedule('notify-failed-video-jobs','*/10 * * * *', $$select public.notify_failed_video_jobs()$$);
