package service

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

type mockSessionRepository struct {
	sessions map[[32]byte]*model.Session
}

func newMockSessionRepository() *mockSessionRepository {
	return &mockSessionRepository{
		sessions: make(map[[32]byte]*model.Session),
	}
}

func (m *mockSessionRepository) CreateSession(
	_ context.Context,
	session *model.Session,
) error {
	var key [32]byte
	copy(key[:], session.TokenHash)

	m.sessions[key] = session
	return nil
}

func (m *mockSessionRepository) FindSessionByTokenHash(
	_ context.Context,
	tokenHash []byte,
) (*model.Session, error) {
	var key [32]byte
	copy(key[:], tokenHash)

	return m.sessions[key], nil
}

func (m *mockSessionRepository) RevokeSession(
	_ context.Context,
	sessionID uuid.UUID,
) error {
	now := time.Now().UTC()

	for _, session := range m.sessions {
		if session.ID == sessionID {
			session.RevokedAt = &now
			return nil
		}
	}

	return nil
}

func (m *mockSessionRepository) RevokeAllSessionsByUserID(
	_ context.Context,
	userID uuid.UUID,
) error {
	now := time.Now().UTC()

	for _, session := range m.sessions {
		if session.UserID == userID {
			session.RevokedAt = &now
		}
	}

	return nil
}

func (m *mockSessionRepository) DeleteExpiredSessions(
	_ context.Context,
	now time.Time,
) (int64, error) {
	var count int64

	for key, session := range m.sessions {
		if !session.ExpiresAt.After(now) {
			delete(m.sessions, key)
			count++
		}
	}

	return count, nil
}

// TestCreateSessionはセッションの生成を確認します。
func TestCreateSession(t *testing.T) {
	repo := newMockSessionRepository()
	service := NewSessionService(repo)

	userID := uuid.New()

	token, err := service.CreateSession(
		context.Background(),
		userID,
	)
	if err != nil {
		t.Fatalf("CreateSession failed: %v", err)
	}

	decoded, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		t.Fatalf("invalid token encoding: %v", err)
	}

	if len(decoded) != 32 {
		t.Fatalf("token length = %d, want 32", len(decoded))
	}

	hash := sha256.Sum256([]byte(token))
	session := repo.sessions[hash]

	if session == nil {
		t.Fatal("session was not saved")
	}

	if session.UserID != userID {
		t.Fatalf("user ID = %s, want %s", session.UserID, userID)
	}

	duration := session.ExpiresAt.Sub(session.CreatedAt)

	if duration != 7*24*time.Hour {
		t.Fatalf("duration = %v, want 7 days", duration)
	}
}

// TestValidateSessionは有効なセッションを確認します。
func TestValidateSession(t *testing.T) {
	repo := newMockSessionRepository()
	service := NewSessionService(repo)

	token, err := service.CreateSession(
		context.Background(),
		uuid.New(),
	)
	if err != nil {
		t.Fatal(err)
	}

	session, err := service.ValidateSession(
		context.Background(),
		token,
	)
	if err != nil {
		t.Fatalf("ValidateSession failed: %v", err)
	}

	if session == nil {
		t.Fatal("expected valid session")
	}
}

// TestValidateSessionInvalidTokenは不正なトークンを拒否することを確認します。
func TestValidateSessionInvalidToken(t *testing.T) {
	repo := newMockSessionRepository()
	service := NewSessionService(repo)

	_, err := service.ValidateSession(
		context.Background(),
		"invalid-token",
	)

	if !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("got %v, want ErrInvalidSession", err)
	}
}

// TestValidateSessionExpiredは期限切れセッションを拒否することを確認します。
func TestValidateSessionExpired(t *testing.T) {
	repo := newMockSessionRepository()
	service := NewSessionService(repo)

	token, err := service.CreateSession(
		context.Background(),
		uuid.New(),
	)
	if err != nil {
		t.Fatal(err)
	}

	hash := sha256.Sum256([]byte(token))
	repo.sessions[hash].ExpiresAt = time.Now().Add(-time.Minute)

	_, err = service.ValidateSession(
		context.Background(),
		token,
	)

	if !errors.Is(err, ErrExpiredSession) {
		t.Fatalf("got %v, want ErrExpiredSession", err)
	}
}

// TestRevokeSessionはログアウト後にセッションが無効になることを確認します。
func TestRevokeSession(t *testing.T) {
	repo := newMockSessionRepository()
	service := NewSessionService(repo)

	token, err := service.CreateSession(
		context.Background(),
		uuid.New(),
	)
	if err != nil {
		t.Fatal(err)
	}

	if err := service.RevokeSession(
		context.Background(),
		token,
	); err != nil {
		t.Fatalf("RevokeSession failed: %v", err)
	}

	_, err = service.ValidateSession(
		context.Background(),
		token,
	)

	if !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("got %v, want ErrInvalidSession", err)
	}
}

// TestRevokeAllSessionsはユーザーの全セッションが失効することを確認します。
func TestRevokeAllSessions(t *testing.T) {
	repo := newMockSessionRepository()
	service := NewSessionService(repo)

	userID := uuid.New()

	token1, err := service.CreateSession(context.Background(), userID)
	if err != nil {
		t.Fatal(err)
	}

	token2, err := service.CreateSession(context.Background(), userID)
	if err != nil {
		t.Fatal(err)
	}

	if err := service.RevokeAllSessions(
		context.Background(),
		userID,
	); err != nil {
		t.Fatal(err)
	}

	for _, token := range []string{token1, token2} {
		_, err := service.ValidateSession(context.Background(), token)

		if !errors.Is(err, ErrInvalidSession) {
			t.Fatalf("got %v, want ErrInvalidSession", err)
		}
	}
}

// TestDeleteExpiredSessionsは期限切れセッションの削除を確認します。
func TestDeleteExpiredSessions(t *testing.T) {
	repo := newMockSessionRepository()
	service := NewSessionService(repo)

	token, err := service.CreateSession(
		context.Background(),
		uuid.New(),
	)
	if err != nil {
		t.Fatal(err)
	}

	hash := sha256.Sum256([]byte(token))
	repo.sessions[hash].ExpiresAt = time.Now().Add(-time.Minute)

	count, err := service.DeleteExpiredSessions(context.Background())
	if err != nil {
		t.Fatal(err)
	}

	if count != 1 {
		t.Fatalf("deleted count = %d, want 1", count)
	}

	if len(repo.sessions) != 0 {
		t.Fatal("expired session was not deleted")
	}
}
