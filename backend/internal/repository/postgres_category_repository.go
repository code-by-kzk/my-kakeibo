package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

var (
	ErrCategoryNotFound = errors.New("カテゴリが存在しません")
	ErrCategoryInUse    = errors.New("使用中のカテゴリは削除できません")
	ErrCategoryConflict = errors.New("カテゴリ名が重複しています")
)

type PostgresCategoryRepository struct {
	db *pgxpool.Pool
}

func NewPostgresCategoryRepository(
	db *pgxpool.Pool,
) *PostgresCategoryRepository {
	return &PostgresCategoryRepository{db: db}
}

func (r *PostgresCategoryRepository) FindAll(
	ctx context.Context,
) ([]model.ExpenseCategory, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, name, sort_order, created_at, updated_at
		FROM expense_categories
		ORDER BY sort_order ASC, id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categories := make([]model.ExpenseCategory, 0)

	for rows.Next() {
		var category model.ExpenseCategory

		if err := rows.Scan(
			&category.ID,
			&category.Name,
			&category.SortOrder,
			&category.CreatedAt,
			&category.UpdatedAt,
		); err != nil {
			return nil, err
		}

		categories = append(categories, category)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return categories, nil
}

func (r *PostgresCategoryRepository) Create(
	ctx context.Context,
	name string,
) (*model.ExpenseCategory, error) {
	var exists bool

	err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM expense_categories
			WHERE LOWER(name) = LOWER($1)
		)
	`, name).Scan(&exists)
	if err != nil {
		return nil, err
	}

	if exists {
		return nil, ErrCategoryConflict
	}

	// VARCHAR(30) に収まるIDを生成する
	// "custom_" 7文字 + 11バイトの16進数22文字 = 29文字
	randomBytes := make([]byte, 11)
	if _, err := rand.Read(randomBytes); err != nil {
		return nil, err
	}

	id := "custom_" + hex.EncodeToString(randomBytes)

	var category model.ExpenseCategory

	err = r.db.QueryRow(ctx, `
		INSERT INTO expense_categories (
			id, name, sort_order
		)
		VALUES (
			$1,
			$2,
			(
				SELECT COALESCE(MAX(sort_order), 0) + 1
				FROM expense_categories
			)
		)
		RETURNING
			id, name, sort_order, created_at, updated_at
	`, id, name).Scan(
		&category.ID,
		&category.Name,
		&category.SortOrder,
		&category.CreatedAt,
		&category.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("カテゴリ登録失敗: %w", err)
	}

	return &category, nil
}

func (r *PostgresCategoryRepository) Update(
	ctx context.Context,
	id string,
	name string,
) (*model.ExpenseCategory, error) {
	var category model.ExpenseCategory

	err := r.db.QueryRow(ctx, `
		UPDATE expense_categories
		SET name = $2,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING
			id, name, sort_order, created_at, updated_at
	`, id, name).Scan(
		&category.ID,
		&category.Name,
		&category.SortOrder,
		&category.CreatedAt,
		&category.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrCategoryNotFound
	}
	if err != nil {
		return nil, err
	}

	return &category, nil
}

func (r *PostgresCategoryRepository) Delete(
	ctx context.Context,
	id string,
) error {
	tag, err := r.db.Exec(ctx, `
		DELETE FROM expense_categories
		WHERE id = $1
	`, id)

	if err != nil {
		var pgErr *pgconn.PgError

		if errors.As(err, &pgErr) &&
			pgErr.Code == "23503" {
			return ErrCategoryInUse
		}

		return err
	}

	if tag.RowsAffected() == 0 {
		return ErrCategoryNotFound
	}

	return nil
}
