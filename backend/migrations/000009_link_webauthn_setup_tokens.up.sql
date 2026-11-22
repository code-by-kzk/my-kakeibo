
ALTER TABLE webauthn_challenges
ADD COLUMN setup_token_id UUID
REFERENCES passkey_setup_tokens(id)
ON DELETE CASCADE;

ALTER TABLE webauthn_challenges
ADD CONSTRAINT chk_registration_setup_token
CHECK (
    challenge_type <> 'registration'
    OR setup_token_id IS NOT NULL
);

CREATE INDEX idx_webauthn_challenges_setup_token_id
ON webauthn_challenges(setup_token_id);
