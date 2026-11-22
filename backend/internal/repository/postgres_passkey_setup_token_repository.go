package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

// PostgresPasskeySetupTokenRepositoryは、
// PostgreSQLを使用して初期登録トークンを管理します。
type PostgresPasskeySetupTokenRepository struct {
	db *pgxpool.Pool
}

// NewPostgresPasskeySetupTokenRepositoryはRepositoryを生成します。
func NewPostgresPasskeySetupTokenRepository(
	db *pgxpool.Pool,
) *PostgresPasskeySetupTokenRepository {
	return &PostgresPasskeySetupTokenRepository{
		db: db,
	}
}

// インターフェースを満たすことをコンパイル時に確認します。
var _ PasskeySetupTokenRepository = (*PostgresPasskeySetupTokenRepository)(nil)

// Createは初期登録トークンを保存します。
func (r *PostgresPasskeySetupTokenRepository) Create(
	ctx context.Context,
	token *model.PasskeySetupToken,
) error {
	const query = `
		INSERT INTO passkey_setup_tokens (
			id,
			user_id,
			token_hash,
			created_at,
			expires_at
		)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err := r.db.Exec(
		ctx,
		query,
		token.ID,
		token.UserID,
		token.TokenHash,
		token.CreatedAt,
		token.ExpiresAt,
	)
	if err != nil {
		return fmt.Errorf("create passkey setup token: %w", err)
	}

	return nil
}

// FindByTokenHashはトークンのハッシュから
// 初期登録トークンを取得します。
func (r *PostgresPasskeySetupTokenRepository) FindByTokenHash(
	ctx context.Context,
	tokenHash []byte,
) (*model.PasskeySetupToken, error) {
	const query = `
		SELECT
			id,
			user_id,
			token_hash,
			created_at,
			expires_at,
			used_at
		FROM passkey_setup_tokens
		WHERE token_hash = $1
	`

	var token model.PasskeySetupToken

	err := r.db.QueryRow(ctx, query, tokenHash).Scan(
		&token.ID,
		&token.UserID,
		&token.TokenHash,
		&token.CreatedAt,
		&token.ExpiresAt,
		&token.UsedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}

		return nil, fmt.Errorf(
			"find passkey setup token by hash: %w",
			err,
		)
	}

	return &token, nil
}

// Consumeは有効な初期登録トークンを使用済みにします。
// 更新できた場合のみtrueを返します。
func (r *PostgresPasskeySetupTokenRepository) Consume(
	ctx context.Context,
	tokenID uuid.UUID,
	now time.Time,
) (bool, error) {
	const query = `
		UPDATE passkey_setup_tokens
		SET used_at = $2
		WHERE id = $1
		  AND used_at IS NULL
		  AND expires_at > $2
	`

	result, err := r.db.Exec(
		ctx,
		query,
		tokenID,
		now,
	)
	if err != nil {
		return false, fmt.Errorf(
			"consume passkey setup token: %w",
			err,
		)
	}

	return result.RowsAffected() == 1, nil
}

// DeleteExpiredは期限切れトークンを削除します。
func (r *PostgresPasskeySetupTokenRepository) DeleteExpired(
	ctx context.Context,
	now time.Time,
) (int64, error) {
	const query = `
		DELETE FROM passkey_setup_tokens
		WHERE expires_at <= $1
	`

	result, err := r.db.Exec(
		ctx,
		query,
		now,
	)
	if err != nil {
		return 0, fmt.Errorf(
			"delete expired passkey setup tokens: %w",
			err,
		)
	}

	return result.RowsAffected(), nil
}
