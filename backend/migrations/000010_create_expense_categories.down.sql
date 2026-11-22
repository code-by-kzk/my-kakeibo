
BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM expense_categories
        WHERE id NOT IN (
            'food',
            'daily',
            'transport',
            'housing',
            'utilities',
            'entertainment',
            'other'
        )
    ) THEN
        RAISE EXCEPTION
            '追加されたカテゴリが存在するためロールバックできません';
    END IF;
END
$$;

ALTER TABLE expenses
    DROP CONSTRAINT expenses_category_fkey;

ALTER TABLE expenses
    ADD CONSTRAINT expenses_category_check
    CHECK (
        category IN (
            'food',
            'daily',
            'transport',
            'housing',
            'utilities',
            'entertainment',
            'other'
        )
    );

DROP TABLE expense_categories;

COMMIT;
