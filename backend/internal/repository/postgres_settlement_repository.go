package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

type PostgresSettlementRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresSettlementRepository(
	pool *pgxpool.Pool,
) *PostgresSettlementRepository {
	return &PostgresSettlementRepository{pool: pool}
}

func (r *PostgresSettlementRepository) FindAll(
	ctx context.Context,
) ([]model.Settlement, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			id, date, amount,
			from_person, to_person,
			created_at, updated_at
		FROM settlements
		ORDER BY date DESC, id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	settlements := make([]model.Settlement, 0)

	for rows.Next() {
		var s model.Settlement
		var date time.Time

		err := rows.Scan(
			&s.ID,
			&date,
			&s.Amount,
			&s.FromPerson,
			&s.ToPerson,
			&s.CreatedAt,
			&s.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		s.Date = date.Format("2006-01-02")
		settlements = append(settlements, s)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return settlements, nil
}

func (r *PostgresSettlementRepository) Create(
	ctx context.Context,
	s model.Settlement,
) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO settlements (
			id, date, amount,
			from_person, to_person,
			created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`,
		s.ID,
		s.Date,
		s.Amount,
		s.FromPerson,
		s.ToPerson,
		s.CreatedAt,
		s.UpdatedAt,
	)

	return err
}

func (r *PostgresSettlementRepository) Delete(
	ctx context.Context,
	id string,
) error {
	result, err := r.pool.Exec(ctx, `
		DELETE FROM settlements
		WHERE id = $1
	`, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}
