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

var (
	ErrRegistrationAlreadyCompleted = errors.New(
		"passkey registration already completed",
	)
	ErrRegistrationChallengeInvalid = errors.New(
		"registration challenge is invalid or expired",
	)
	ErrRegistrationSetupTokenInvalid = errors.New(
		"registration setup token is invalid or expired",
	)
	ErrRegistrationUserNotFound = errors.New(
		"registration user not found",
	)
)

// PostgresPasskeyRegistrationRepositoryは、
// パスキー初期登録の確定処理を管理します。
type PostgresPasskeyRegistrationRepository struct {
	db *pgxpool.Pool
}

// NewPostgresPasskeyRegistrationRepositoryはRepositoryを生成します。
func NewPostgresPasskeyRegistrationRepository(
	db *pgxpool.Pool,
) *PostgresPasskeyRegistrationRepository {
	return &PostgresPasskeyRegistrationRepository{
		db: db,
	}
}

var _ PasskeyRegistrationRepository = (*PostgresPasskeyRegistrationRepository)(nil)

// CompleteRegistrationは初期登録をトランザクションで確定します。
//
// 呼び出し前にWebAuthn登録応答の検証が完了している必要があります。
func (r *PostgresPasskeyRegistrationRepository) CompleteRegistration(
	ctx context.Context,
	userID uuid.UUID,
	setupTokenID uuid.UUID,
	challengeID uuid.UUID,
	passkey *model.Passkey,
) error {
	if userID == uuid.Nil ||
		setupTokenID == uuid.Nil ||
		challengeID == uuid.Nil ||
		passkey == nil ||
		passkey.ID == uuid.Nil ||
		passkey.UserID != userID ||
		len(passkey.CredentialID) == 0 ||
		len(passkey.PublicKey) == 0 ||
		len(passkey.CredentialData) == 0 {
		return errors.New("invalid passkey registration input")
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin passkey registration transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. ユーザー行をロックして同時初期登録を直列化
	var lockedUserID uuid.UUID

	err = tx.QueryRow(
		ctx,
		`SELECT id FROM users WHERE id = $1 FOR UPDATE`,
		userID,
	).Scan(&lockedUserID)

	if errors.Is(err, pgx.ErrNoRows) {
		return ErrRegistrationUserNotFound
	}
	if err != nil {
		return fmt.Errorf("lock registration user: %w", err)
	}

	// 2. すでにパスキーが登録されていないか確認
	var alreadyRegistered bool

	err = tx.QueryRow(
		ctx,
		`SELECT EXISTS (
			SELECT 1 FROM passkeys WHERE user_id = $1
		)`,
		userID,
	).Scan(&alreadyRegistered)

	if err != nil {
		return fmt.Errorf("check existing passkeys: %w", err)
	}
	if alreadyRegistered {
		return ErrRegistrationAlreadyCompleted
	}

	now := time.Now().UTC()

	// 3. チャレンジの状態と紐付けを確認し、使用済みにする
	challengeResult, err := tx.Exec(
		ctx,
		`
		UPDATE webauthn_challenges
		SET consumed_at = $4
		WHERE id = $1
		  AND user_id = $2
		  AND setup_token_id = $3
		  AND challenge_type = 'registration'
		  AND consumed_at IS NULL
		  AND expires_at > $4
		`,
		challengeID,
		userID,
		setupTokenID,
		now,
	)
	if err != nil {
		return fmt.Errorf("consume registration challenge: %w", err)
	}
	if challengeResult.RowsAffected() != 1 {
		return ErrRegistrationChallengeInvalid
	}

	// 4. 初期登録トークンを使用済みにする
	tokenResult, err := tx.Exec(
		ctx,
		`
		UPDATE passkey_setup_tokens
		SET used_at = $3
		WHERE id = $1
		  AND user_id = $2
		  AND used_at IS NULL
		  AND expires_at > $3
		`,
		setupTokenID,
		userID,
		now,
	)
	if err != nil {
		return fmt.Errorf("consume registration setup token: %w", err)
	}
	if tokenResult.RowsAffected() != 1 {
		return ErrRegistrationSetupTokenInvalid
	}

	// 5. 検証済みパスキーを保存
	err = tx.QueryRow(
		ctx,
		`
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
		`,
		passkey.ID,
		passkey.UserID,
		passkey.CredentialID,
		passkey.PublicKey,
		int64(passkey.SignCount),
		passkey.CredentialData,
		passkey.Name,
	).Scan(&passkey.CreatedAt)

	if err != nil {
		return fmt.Errorf("insert registered passkey: %w", err)
	}

	// 6. すべて成功した場合のみ確定
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit passkey registration: %w", err)
	}

	return nil
}
