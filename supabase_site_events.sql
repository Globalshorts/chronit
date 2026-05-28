-- ============================================================
-- Chronit Site Events Table
-- 관리자가 홈페이지 이벤트 배너를 DB에서 직접 관리
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active     BOOLEAN NOT NULL DEFAULT false,
    label      TEXT    NOT NULL DEFAULT '이벤트 진행중',
    text       TEXT    NOT NULL DEFAULT '',
    cta_text   TEXT    NOT NULL DEFAULT '지금 참여',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 초기 행 삽입 (항상 1행만 사용)
INSERT INTO public.site_events (active, label, text, cta_text)
VALUES (false, '이벤트 진행중', '', '지금 참여')
ON CONFLICT DO NOTHING;

-- RLS 활성화
ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (홈페이지에서 fetch)
CREATE POLICY "site_events_public_read"
    ON public.site_events FOR SELECT
    USING (true);

-- super_admin만 수정 가능
CREATE POLICY "site_events_admin_write"
    ON public.site_events FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.subscriptions
            WHERE user_id = auth.uid()
              AND role = 'super_admin'
        )
    );
