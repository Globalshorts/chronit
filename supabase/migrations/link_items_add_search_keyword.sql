-- 저장된 링크가 쿠팡 검색어(서술형 한글 상품명)를 유지하도록 컬럼 추가
alter table public.link_items add column if not exists search_keyword text;
