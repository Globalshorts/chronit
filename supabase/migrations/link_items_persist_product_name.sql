-- 저장된 링크가 상품명(쿠팡 검색어)을 유지하도록 컬럼 + 기존분 백필
alter table public.link_items add column if not exists search_keyword text;
update public.link_items li
set search_keyword = vj.product_name
from public.video_jobs vj
where li.video_job_id = vj.id
  and coalesce(li.search_keyword,'') = ''
  and coalesce(vj.product_name,'') <> '';
