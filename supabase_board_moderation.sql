-- ============================================================
-- 게시판 모더레이션 (욕설/무단광고 차단)
-- project: oxygqtbdpnxxcgzwdlzi
-- ============================================================
-- 2중 방어:
--  1) Edge Function `board-submit` : UI 작성 경로. 한글 자모분해(toJamo) 매칭으로
--     ㅁㅜㄹㅛ꼬@머@니 / 띄어쓰기 / @*특수문자 / 전각 / 반복문자 회피를 무력화.
--     통과 시 board_create_*_rpc(사용자 JWT)로 위임.
--  2) DB RPC 내부 board_moderation_check() : API 직접 호출 우회 대비 기본 검사
--     (NFKC+기호제거+반복축약 후 word 부분일치 / URL·전화·연락처 regex).
-- 금지어는 moderation_terms 테이블에서 관리(관리자만, 목록 비노출).
-- 한계: 꽁→꼬 같은 유사발음 오타는 신고+자동숨김+관리자검토로 보완 예정.

create table if not exists public.moderation_terms (
  id bigint generated always as identity primary key,
  kind text not null default 'word' check (kind in ('word','regex')),
  term text not null, label text not null default '부적절',
  active boolean not null default true, created_at timestamptz not null default now()
);
-- RLS: 관리자 전용(목록 비노출). 검사 함수는 SECURITY DEFINER로 우회 조회.
-- 함수: board_moderation_check(text) returns label|null
--   - word : NFKC→소문자→[한글/자모/영숫자]만→반복축약 후 position()
--   - regex: 기호 보존본에 ~* 매칭 (URL/도메인/카톡·텔레 유도/전화번호)
-- board_create_post_rpc / board_create_comment_rpc 내부에서 호출하여 차단.
-- (전체 정의는 운영 마이그레이션 board_moderation / board_rpc_with_moderation 참고)
