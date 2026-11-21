
CREATE TABLE settlements (
    id UUID PRIMARY KEY,
    date DATE NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    from_person VARCHAR(1) NOT NULL
        CHECK (from_person IN ('A', 'B')),
    to_person VARCHAR(1) NOT NULL
        CHECK (to_person IN ('A', 'B')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT settlements_different_person_check
        CHECK (from_person <> to_person)
);

CREATE INDEX idx_settlements_date
    ON settlements (date DESC, id ASC);
