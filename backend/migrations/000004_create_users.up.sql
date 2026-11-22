
CREATE TABLE users (
    id UUID PRIMARY KEY,
    member_code VARCHAR(1) NOT NULL UNIQUE
        CHECK (member_code IN ('A', 'B')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 利用者はAさん・Bさんの2人のみ
INSERT INTO users (id, member_code)
VALUES
    ('a0000000-0000-4000-8000-000000000001', 'A'),
    ('b0000000-0000-4000-8000-000000000002', 'B');
