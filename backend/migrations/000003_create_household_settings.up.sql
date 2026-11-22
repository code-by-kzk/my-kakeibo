
CREATE TABLE household_settings (
    id INTEGER PRIMARY KEY DEFAULT 1
        CHECK (id = 1),

    household_name TEXT NOT NULL
        CHECK (LENGTH(TRIM(household_name)) > 0),

    member_name_a TEXT NOT NULL
        CHECK (LENGTH(TRIM(member_name_a)) > 0),

    member_name_b TEXT NOT NULL
        CHECK (LENGTH(TRIM(member_name_b)) > 0),

    default_share_percent_a NUMERIC(5, 2) NOT NULL
        CHECK (
            default_share_percent_a >= 0
            AND default_share_percent_a <= 100
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO household_settings (
    id,
    household_name,
    member_name_a,
    member_name_b,
    default_share_percent_a
)
VALUES (
    1,
    'ふたりの家計簿',
    'Aさん',
    'Bさん',
    50
);
