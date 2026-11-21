package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

type PostgresExpenseRepository struct {
	db *pgxpool.Pool
}

func NewPostgresExpenseRepository(
	db *pgxpool.Pool,
) *PostgresExpenseRepository {
	return &PostgresExpenseRepository{db: db}
}

const expenseColumns = `
	id, date, amount, payer, payment_method,
	category, share_a, share_b, created_at, updated_at
`

func scanExpense(row pgx.Row) (*model.Expense, error) {
	var e model.Expense
	var date time.Time

	err := row.Scan(
		&e.ID,
		&date,
		&e.Amount,
		&e.Payer,
		&e.PaymentMethod,
		&e.Category,
		&e.Shares.A,
		&e.Shares.B,
		&e.CreatedAt,
		&e.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	e.Date = date.Format("2006-01-02")
	return &e, nil
}

func (r *PostgresExpenseRepository) FindAll(
	ctx context.Context,
) ([]model.Expense, error) {
	rows, err := r.db.Query(ctx, `
		SELECT `+expenseColumns+`
		FROM expenses
		ORDER BY date DESC, id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]model.Expense, 0)

	for rows.Next() {
		e, err := scanExpense(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, *e)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

func (r *PostgresExpenseRepository) FindByID(
	ctx context.Context,
	id string,
) (*model.Expense, error) {
	row := r.db.QueryRow(ctx, `
		SELECT `+expenseColumns+`
		FROM expenses
		WHERE id = $1
	`, id)

	e, err := scanExpense(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return e, err
}

func (r *PostgresExpenseRepository) Create(
	ctx context.Context,
	e model.Expense,
) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO expenses (
			id, date, amount, payer, payment_method,
			category, share_a, share_b, created_at, updated_at
		) VALUES (
			$1, $2::date, $3, $4, $5,
			$6, $7, $8, $9, $10
		)
	`,
		e.ID, e.Date, e.Amount, e.Payer,
		e.PaymentMethod, e.Category,
		e.Shares.A, e.Shares.B,
		e.CreatedAt, e.UpdatedAt,
	)
	return err
}

func (r *PostgresExpenseRepository) Update(
	ctx context.Context,
	e model.Expense,
) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE expenses
		SET date = $2::date,
			amount = $3,
			payer = $4,
			payment_method = $5,
			category = $6,
			share_a = $7,
			share_b = $8,
			updated_at = $9
		WHERE id = $1
	`,
		e.ID, e.Date, e.Amount, e.Payer,
		e.PaymentMethod, e.Category,
		e.Shares.A, e.Shares.B, e.UpdatedAt,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *PostgresExpenseRepository) Delete(
	ctx context.Context,
	id string,
) error {
	tag, err := r.db.Exec(ctx,
		`DELETE FROM expenses WHERE id = $1`, id,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

var _ ExpenseRepository = (*PostgresExpenseRepository)(nil)
