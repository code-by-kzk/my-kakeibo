
CREATE TABLE passkeys (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
    credential_id BYTEA NOT NULL UNIQUE,
    public_key BYTEA NOT NULL,
    sign_count BIGINT NOT NULL DEFAULT 0
        CHECK (sign_count >= 0),
    credential_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    name VARCHAR(100) NOT NULL DEFAULT 'パスキー',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_passkeys_user_id
    ON passkeys(user_id);
