
DROP INDEX IF EXISTS idx_webauthn_challenges_setup_token_id;

ALTER TABLE webauthn_challenges
DROP CONSTRAINT IF EXISTS chk_registration_setup_token;

ALTER TABLE webauthn_challenges
DROP COLUMN IF EXISTS setup_token_id;
