package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
)

const (
	setupTokenBytes    = 32
	setupTokenDuration = 30 * time.Minute
)

var (
	ErrInvalidSetupToken = errors.New("invalid setup token")
	ErrExpiredSetupToken = errors.New("expired setup token")
)

// PasskeySetupTokenServiceは初期登録トークンを管理します。
type PasskeySetupTokenService struct {
	repository repository.PasskeySetupTokenRepository
}

// NewPasskeySetupTokenServiceはServiceを生成します。
func NewPasskeySetupTokenService(
	repo repository.PasskeySetupTokenRepository,
) *PasskeySetupTokenService {
	return &PasskeySetupTokenService{
		repository: repo,
	}
}

// Issueは初期登録トークンを発行します。
// 戻り値のトークンは秘密情報のため、安全に受け渡してください。
// このメソッドは管理者専用の処理からのみ呼び出します。
func (s *PasskeySetupTokenService) Issue(
	ctx context.Context,
	userID uuid.UUID,
) (string, error) {
	if userID == uuid.Nil {
		return "", fmt.Errorf("issue setup token: invalid user ID")
	}

	tokenBytes := make([]byte, setupTokenBytes)

	if _, err := rand.Read(tokenBytes); err != nil {
		return "", fmt.Errorf(
			"generate setup token: %w",
			err,
		)
	}

	token := base64.RawURLEncoding.EncodeToString(tokenBytes)
	tokenHash := sha256.Sum256([]byte(token))

	now := time.Now().UTC()

	setupToken := &model.PasskeySetupToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: tokenHash[:],
		CreatedAt: now,
		ExpiresAt: now.Add(setupTokenDuration),
	}

	if err := s.repository.Create(ctx, setupToken); err != nil {
		return "", fmt.Errorf(
			"save setup token: %w",
			err,
		)
	}

	return token, nil
}

// Validateは初期登録トークンの有効性を確認します。
func (s *PasskeySetupTokenService) Validate(
	ctx context.Context,
	token string,
) (*model.PasskeySetupToken, error) {
	if len(token) != base64.RawURLEncoding.EncodedLen(setupTokenBytes) {
		return nil, ErrInvalidSetupToken
	}

	decoded, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil || len(decoded) != setupTokenBytes {
		return nil, ErrInvalidSetupToken
	}

	tokenHash := sha256.Sum256([]byte(token))

	setupToken, err := s.repository.FindByTokenHash(
		ctx,
		tokenHash[:],
	)
	if err != nil {
		return nil, fmt.Errorf(
			"find setup token: %w",
			err,
		)
	}

	if setupToken == nil {
		return nil, ErrInvalidSetupToken
	}

	if setupToken.UsedAt != nil {
		return nil, ErrInvalidSetupToken
	}

	if !setupToken.IsValid(time.Now().UTC()) {
		return nil, ErrExpiredSetupToken
	}

	return setupToken, nil
}
