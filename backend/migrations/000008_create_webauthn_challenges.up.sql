
CREATE TABLE webauthn_challenges (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_type VARCHAR(20) NOT NULL
        CHECK (challenge_type IN ('registration', 'authentication')),
    session_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    CONSTRAINT chk_webauthn_challenge_expiry
        CHECK (expires_at > created_at)
);

CREATE INDEX idx_webauthn_challenges_user_id
    ON webauthn_challenges(user_id);

CREATE INDEX idx_webauthn_challenges_expires_at
    ON webauthn_challenges(expires_at);
