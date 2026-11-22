
CREATE TABLE passkey_setup_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash BYTEA NOT NULL UNIQUE
        CHECK (octet_length(token_hash) = 32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    CONSTRAINT chk_setup_token_expiry
        CHECK (expires_at > created_at)
);

CREATE INDEX idx_passkey_setup_tokens_user_id
    ON passkey_setup_tokens(user_id);
