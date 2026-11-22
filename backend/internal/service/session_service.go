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
	sessionTokenBytes = 32
	sessionDuration   = 7 * 24 * time.Hour
)

var (
	ErrInvalidSession = errors.New("invalid session")
	ErrExpiredSession = errors.New("expired session")
)

// SessionServiceはログインセッションを管理します。
type SessionService struct {
	repository repository.SessionRepository
}

// NewSessionServiceはSessionServiceを生成します。
func NewSessionService(
	repo repository.SessionRepository,
) *SessionService {
	return &SessionService{
		repository: repo,
	}
}

// CreateSessionは新しいログインセッションを作成します。
// 戻り値のtokenはCookieに設定するための秘密情報です。
func (s *SessionService) CreateSession(
	ctx context.Context,
	userID uuid.UUID,
) (string, error) {
	if userID == uuid.Nil {
		return "", fmt.Errorf("create session: invalid user ID")
	}

	tokenBytes := make([]byte, sessionTokenBytes)

	if _, err := rand.Read(tokenBytes); err != nil {
		return "", fmt.Errorf(
			"generate session token: %w",
			err,
		)
	}

	token := base64.RawURLEncoding.EncodeToString(tokenBytes)
	tokenHash := sha256.Sum256([]byte(token))

	now := time.Now().UTC()

	session := &model.Session{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: tokenHash[:],
		CreatedAt: now,
		ExpiresAt: now.Add(sessionDuration),
	}

	if err := s.repository.CreateSession(ctx, session); err != nil {
		return "", fmt.Errorf("save session: %w", err)
	}

	return token, nil
}

// ValidateSessionはトークンから有効なセッションを取得します。
func (s *SessionService) ValidateSession(
	ctx context.Context,
	token string,
) (*model.Session, error) {
	if len(token) != base64.RawURLEncoding.EncodedLen(sessionTokenBytes) {
		return nil, ErrInvalidSession
	}

	decoded, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil || len(decoded) != sessionTokenBytes {
		return nil, ErrInvalidSession
	}

	tokenHash := sha256.Sum256([]byte(token))

	session, err := s.repository.FindSessionByTokenHash(
		ctx,
		tokenHash[:],
	)
	if err != nil {
		return nil, fmt.Errorf(
			"find session: %w",
			err,
		)
	}

	if session == nil {
		return nil, ErrInvalidSession
	}

	if session.RevokedAt != nil {
		return nil, ErrInvalidSession
	}

	if !session.IsActive(time.Now().UTC()) {
		return nil, ErrExpiredSession
	}

	return session, nil
}

// RevokeSessionはログアウト時にセッションを失効させます。
func (s *SessionService) RevokeSession(
	ctx context.Context,
	token string,
) error {
	session, err := s.ValidateSession(ctx, token)
	if err != nil {
		return err
	}

	if err := s.repository.RevokeSession(
		ctx,
		session.ID,
	); err != nil {
		return fmt.Errorf("revoke session: %w", err)
	}

	return nil
}

// RevokeAllSessionsは指定ユーザーの全セッションを失効させます。
func (s *SessionService) RevokeAllSessions(
	ctx context.Context,
	userID uuid.UUID,
) error {
	if userID == uuid.Nil {
		return fmt.Errorf("revoke all sessions: invalid user ID")
	}

	if err := s.repository.RevokeAllSessionsByUserID(
		ctx,
		userID,
	); err != nil {
		return fmt.Errorf(
			"revoke all sessions: %w",
			err,
		)
	}

	return nil
}

// DeleteExpiredSessionsは期限切れセッションを削除します。
func (s *SessionService) DeleteExpiredSessions(
	ctx context.Context,
) (int64, error) {
	count, err := s.repository.DeleteExpiredSessions(
		ctx,
		time.Now().UTC(),
	)
	if err != nil {
		return 0, fmt.Errorf(
			"delete expired sessions: %w",
			err,
		)
	}

	return count, nil
}
