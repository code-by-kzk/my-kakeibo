
BEGIN;

CREATE TABLE expense_categories (
    id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT expense_categories_name_not_blank
        CHECK (LENGTH(TRIM(name)) > 0)
);

INSERT INTO expense_categories (id, name, sort_order)
VALUES
    ('food', '食費', 1),
    ('daily', '日用品', 2),
    ('transport', '交通費', 3),
    ('housing', '住居費', 4),
    ('utilities', '水道・光熱費', 5),
    ('entertainment', '娯楽', 6),
    ('other', 'その他', 7);

ALTER TABLE expenses
    DROP CONSTRAINT expenses_category_check;

ALTER TABLE expenses
    ADD CONSTRAINT expenses_category_fkey
    FOREIGN KEY (category)
    REFERENCES expense_categories(id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT;

COMMIT;
