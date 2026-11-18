-- 008_account_recovery.sql
-- Account Recovery & Security Questions for zero-loss account access

ALTER TABLE users ADD COLUMN security_question TEXT;
ALTER TABLE users ADD COLUMN security_answer_hash TEXT;
ALTER TABLE users ADD COLUMN recovery_pin_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
