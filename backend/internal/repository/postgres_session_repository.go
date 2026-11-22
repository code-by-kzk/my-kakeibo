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

// PostgresSessionRepositoryはPostgreSQLを使用して
// ログインセッションを管理します。
type PostgresSessionRepository struct {
	db *pgxpool.Pool
}

// NewPostgresSessionRepositoryはRepositoryを生成します。
func NewPostgresSessionRepository(
	db *pgxpool.Pool,
) *PostgresSessionRepository {
	return &PostgresSessionRepository{
		db: db,
	}
}

// SessionRepositoryインターフェースを満たすことを確認します。
var _ SessionRepository = (*PostgresSessionRepository)(nil)

// CreateSessionは新しいセッションを保存します。
func (r *PostgresSessionRepository) CreateSession(
	ctx context.Context,
	session *model.Session,
) error {
	const query = `
		INSERT INTO sessions (
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
		session.ID,
		session.UserID,
		session.TokenHash,
		session.CreatedAt,
		session.ExpiresAt,
	)
	if err != nil {
		return fmt.Errorf("create session: %w", err)
	}

	return nil
}

// FindSessionByTokenHashはトークンのハッシュから
// セッションを取得します。
func (r *PostgresSessionRepository) FindSessionByTokenHash(
	ctx context.Context,
	tokenHash []byte,
) (*model.Session, error) {
	const query = `
		SELECT
			id,
			user_id,
			token_hash,
			created_at,
			expires_at,
			revoked_at
		FROM sessions
		WHERE token_hash = $1
	`

	var session model.Session

	err := r.db.QueryRow(ctx, query, tokenHash).Scan(
		&session.ID,
		&session.UserID,
		&session.TokenHash,
		&session.CreatedAt,
		&session.ExpiresAt,
		&session.RevokedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf(
			"find session by token hash: %w",
			err,
		)
	}

	return &session, nil
}

// RevokeSessionは指定セッションを失効させます。
func (r *PostgresSessionRepository) RevokeSession(
	ctx context.Context,
	sessionID uuid.UUID,
) error {
	const query = `
		UPDATE sessions
		SET revoked_at = NOW()
		WHERE id = $1
		  AND revoked_at IS NULL
	`

	_, err := r.db.Exec(ctx, query, sessionID)
	if err != nil {
		return fmt.Errorf("revoke session: %w", err)
	}

	return nil
}

// RevokeAllSessionsByUserIDはユーザーの全セッションを失効させます。
func (r *PostgresSessionRepository) RevokeAllSessionsByUserID(
	ctx context.Context,
	userID uuid.UUID,
) error {
	const query = `
		UPDATE sessions
		SET revoked_at = NOW()
		WHERE user_id = $1
		  AND revoked_at IS NULL
	`

	_, err := r.db.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf(
			"revoke all sessions by user ID: %w",
			err,
		)
	}

	return nil
}

// DeleteExpiredSessionsは期限切れセッションを削除します。
func (r *PostgresSessionRepository) DeleteExpiredSessions(
	ctx context.Context,
	now time.Time,
) (int64, error) {
	const query = `
		DELETE FROM sessions
		WHERE expires_at <= $1
	`

	result, err := r.db.Exec(ctx, query, now)
	if err != nil {
		return 0, fmt.Errorf(
			"delete expired sessions: %w",
			err,
		)
	}

	return result.RowsAffected(), nil
}
