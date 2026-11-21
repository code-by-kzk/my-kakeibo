
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY,
    date DATE NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    payer VARCHAR(1) NOT NULL CHECK (payer IN ('A', 'B')),
    payment_method VARCHAR(20) NOT NULL
        CHECK (payment_method IN ('cash', 'credit', 'debit', 'qr')),
    category VARCHAR(30) NOT NULL
        CHECK (category IN (
            'food', 'daily', 'transport', 'housing',
            'utilities', 'entertainment', 'other'
        )),
    share_a BIGINT NOT NULL CHECK (share_a >= 0),
    share_b BIGINT NOT NULL CHECK (share_b >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT expenses_shares_check
        CHECK (share_a <= amount AND share_b = amount - share_a)
);

CREATE INDEX IF NOT EXISTS idx_expenses_date
ON expenses (date DESC, id ASC);
