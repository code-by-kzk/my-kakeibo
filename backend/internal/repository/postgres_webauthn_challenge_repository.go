package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

// PostgresWebAuthnChallengeRepositoryは
// PostgreSQLでWebAuthnチャレンジを管理します。
type PostgresWebAuthnChallengeRepository struct {
	db *pgxpool.Pool
}

// NewPostgresWebAuthnChallengeRepositoryはRepositoryを生成します。
func NewPostgresWebAuthnChallengeRepository(
	db *pgxpool.Pool,
) *PostgresWebAuthnChallengeRepository {
	return &PostgresWebAuthnChallengeRepository{
		db: db,
	}
}

// インターフェースを満たすことをコンパイル時に確認します。
var _ WebAuthnChallengeRepository = (*PostgresWebAuthnChallengeRepository)(nil)

// Createは新しいチャレンジを保存します。
func (r *PostgresWebAuthnChallengeRepository) Create(
	ctx context.Context,
	challenge *model.WebAuthnChallenge,
) error {
	if challenge == nil {
		return errors.New("WebAuthn challenge is nil")
	}

	// 登録用チャレンジでは、初期登録トークンIDが必須です。
	if challenge.ChallengeType == model.WebAuthnChallengeRegistration {
		if challenge.UserID == nil || *challenge.UserID == uuid.Nil {
			return errors.New("registration user ID is required")
		}

		if challenge.SetupTokenID == nil ||
			*challenge.SetupTokenID == uuid.Nil {
			return errors.New("registration setup token ID is required")
		}
	}

	// 認証用チャレンジには初期登録トークンを使用しません。
	if challenge.ChallengeType == model.WebAuthnChallengeAuthentication &&
		challenge.SetupTokenID != nil {
		return errors.New("authentication challenge must not have setup token")
	}

	sessionData, err := json.Marshal(challenge.SessionData)
	if err != nil {
		return fmt.Errorf("marshal WebAuthn session data: %w", err)
	}

	const query = `
		INSERT INTO webauthn_challenges (
			id,
			user_id,
			setup_token_id,
			challenge_type,
			session_data,
			created_at,
			expires_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err = r.db.Exec(
		ctx,
		query,
		challenge.ID,
		challenge.UserID,
		challenge.SetupTokenID,
		challenge.ChallengeType,
		sessionData,
		challenge.CreatedAt,
		challenge.ExpiresAt,
	)
	if err != nil {
		return fmt.Errorf("create WebAuthn challenge: %w", err)
	}

	return nil
}

// FindByIDはチャレンジIDから情報を取得します。
func (r *PostgresWebAuthnChallengeRepository) FindByID(
	ctx context.Context,
	challengeID uuid.UUID,
) (*model.WebAuthnChallenge, error) {
	const query = `
		SELECT
			id,
			user_id,
			setup_token_id,
			challenge_type,
			session_data,
			created_at,
			expires_at,
			consumed_at
		FROM webauthn_challenges
		WHERE id = $1
	`

	var challenge model.WebAuthnChallenge
	var sessionData []byte

	err := r.db.QueryRow(ctx, query, challengeID).Scan(
		&challenge.ID,
		&challenge.UserID,
		&challenge.SetupTokenID,
		&challenge.ChallengeType,
		&sessionData,
		&challenge.CreatedAt,
		&challenge.ExpiresAt,
		&challenge.ConsumedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}

		return nil, fmt.Errorf(
			"find WebAuthn challenge by ID: %w",
			err,
		)
	}

	if err := json.Unmarshal(
		sessionData,
		&challenge.SessionData,
	); err != nil {
		return nil, fmt.Errorf(
			"unmarshal WebAuthn session data: %w",
			err,
		)
	}

	return &challenge, nil
}

// Consumeは未使用・有効期限内・種別一致の
// チャレンジを使用済みにします。
func (r *PostgresWebAuthnChallengeRepository) Consume(
	ctx context.Context,
	challengeID uuid.UUID,
	expectedType string,
	now time.Time,
) (bool, error) {
	const query = `
		UPDATE webauthn_challenges
		SET consumed_at = $3
		WHERE id = $1
		  AND challenge_type = $2
		  AND consumed_at IS NULL
		  AND expires_at > $3
	`

	result, err := r.db.Exec(
		ctx,
		query,
		challengeID,
		expectedType,
		now,
	)
	if err != nil {
		return false, fmt.Errorf(
			"consume WebAuthn challenge: %w",
			err,
		)
	}

	return result.RowsAffected() == 1, nil
}

// DeleteExpiredは期限切れチャレンジを削除します。
func (r *PostgresWebAuthnChallengeRepository) DeleteExpired(
	ctx context.Context,
	now time.Time,
) (int64, error) {
	const query = `
		DELETE FROM webauthn_challenges
		WHERE expires_at <= $1
	`

	result, err := r.db.Exec(ctx, query, now)
	if err != nil {
		return 0, fmt.Errorf(
			"delete expired WebAuthn challenges: %w",
			err,
		)
	}

	return result.RowsAffected(), nil
}
