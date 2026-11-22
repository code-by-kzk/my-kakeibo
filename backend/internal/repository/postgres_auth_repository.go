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

// PostgresAuthRepositoryはPostgreSQLを使用した認証Repositoryです。
type PostgresAuthRepository struct {
	db *pgxpool.Pool
}

// NewPostgresAuthRepositoryはRepositoryを生成します。
func NewPostgresAuthRepository(
	db *pgxpool.Pool,
) *PostgresAuthRepository {
	return &PostgresAuthRepository{db: db}
}

// FindUserByIDはユーザーIDからユーザーを取得します。
func (r *PostgresAuthRepository) FindUserByID(
	ctx context.Context,
	userID uuid.UUID,
) (*model.User, error) {
	const query = `
		SELECT id, member_code
		FROM users
		WHERE id = $1
	`

	var user model.User

	err := r.db.QueryRow(ctx, query, userID).Scan(
		&user.ID,
		&user.MemberCode,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find user by ID: %w", err)
	}

	user.DisplayName = user.MemberCode
	return &user, nil
}

// FindUserByMemberCodeはメンバーコードからユーザーを取得します。
func (r *PostgresAuthRepository) FindUserByMemberCode(
	ctx context.Context,
	memberCode string,
) (*model.User, error) {
	const query = `
		SELECT id, member_code
		FROM users
		WHERE member_code = $1
	`

	var user model.User

	err := r.db.QueryRow(ctx, query, memberCode).Scan(
		&user.ID,
		&user.MemberCode,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf(
			"find user by member code: %w",
			err,
		)
	}

	user.DisplayName = user.MemberCode
	return &user, nil
}

// FindPasskeysByUserIDはユーザーに登録されたパスキーを取得します。
func (r *PostgresAuthRepository) FindPasskeysByUserID(
	ctx context.Context,
	userID uuid.UUID,
) ([]model.Passkey, error) {
	const query = `
		SELECT
			id,
			user_id,
			credential_id,
			public_key,
			sign_count,
			credential_data,
			name,
			created_at,
			last_used_at
		FROM passkeys
		WHERE user_id = $1
		ORDER BY created_at ASC, id ASC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf(
			"find passkeys by user ID: %w",
			err,
		)
	}
	defer rows.Close()

	passkeys := make([]model.Passkey, 0)

	for rows.Next() {
		var passkey model.Passkey
		var signCount int64

		if err := rows.Scan(
			&passkey.ID,
			&passkey.UserID,
			&passkey.CredentialID,
			&passkey.PublicKey,
			&signCount,
			&passkey.CredentialData,
			&passkey.Name,
			&passkey.CreatedAt,
			&passkey.LastUsedAt,
		); err != nil {
			return nil, fmt.Errorf("scan passkey: %w", err)
		}

		if signCount < 0 || signCount > int64(^uint32(0)) {
			return nil, fmt.Errorf(
				"invalid passkey sign count: %d",
				signCount,
			)
		}

		passkey.SignCount = uint32(signCount)
		passkeys = append(passkeys, passkey)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate passkeys: %w", err)
	}

	return passkeys, nil
}

// FindPasskeyByCredentialIDは認証情報IDからパスキーを取得します。
func (r *PostgresAuthRepository) FindPasskeyByCredentialID(
	ctx context.Context,
	credentialID []byte,
) (*model.Passkey, error) {
	const query = `
		SELECT
			id,
			user_id,
			credential_id,
			public_key,
			sign_count,
			credential_data,
			name,
			created_at,
			last_used_at
		FROM passkeys
		WHERE credential_id = $1
	`

	var passkey model.Passkey
	var signCount int64

	err := r.db.QueryRow(ctx, query, credentialID).Scan(
		&passkey.ID,
		&passkey.UserID,
		&passkey.CredentialID,
		&passkey.PublicKey,
		&signCount,
		&passkey.CredentialData,
		&passkey.Name,
		&passkey.CreatedAt,
		&passkey.LastUsedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf(
			"find passkey by credential ID: %w",
			err,
		)
	}

	if signCount < 0 || signCount > int64(^uint32(0)) {
		return nil, fmt.Errorf(
			"invalid passkey sign count: %d",
			signCount,
		)
	}

	passkey.SignCount = uint32(signCount)
	return &passkey, nil
}

// CreatePasskeyは新しいパスキーを登録します。
func (r *PostgresAuthRepository) CreatePasskey(
	ctx context.Context,
	passkey *model.Passkey,
) error {
	const query = `
		INSERT INTO passkeys (
			id,
			user_id,
			credential_id,
			public_key,
			sign_count,
			credential_data,
			name
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at
	`

	err := r.db.QueryRow(
		ctx,
		query,
		passkey.ID,
		passkey.UserID,
		passkey.CredentialID,
		passkey.PublicKey,
		int64(passkey.SignCount),
		passkey.CredentialData,
		passkey.Name,
	).Scan(&passkey.CreatedAt)

	if err != nil {
		return fmt.Errorf("create passkey: %w", err)
	}

	return nil
}

// UpdatePasskeyは認証成功後のパスキー情報を更新します。
func (r *PostgresAuthRepository) UpdatePasskey(
	ctx context.Context,
	passkey *model.Passkey,
) error {
	const query = `
		UPDATE passkeys
		SET
			sign_count = $2,
			credential_data = $3,
			last_used_at = $4
		WHERE id = $1
	`

	now := time.Now().UTC()

	result, err := r.db.Exec(
		ctx,
		query,
		passkey.ID,
		int64(passkey.SignCount),
		passkey.CredentialData,
		now,
	)
	if err != nil {
		return fmt.Errorf("update passkey: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf(
			"update passkey: passkey not found: %s",
			passkey.ID,
		)
	}

	passkey.LastUsedAt = &now
	return nil
}

// AuthRepositoryインターフェースを満たすことをコンパイル時に確認します。
var _ AuthRepository = (*PostgresAuthRepository)(nil)
