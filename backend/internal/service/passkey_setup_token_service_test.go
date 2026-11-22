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

type mockPasskeySetupTokenRepository struct {
	tokens map[[32]byte]*model.PasskeySetupToken
}

func newMockPasskeySetupTokenRepository() *mockPasskeySetupTokenRepository {
	return &mockPasskeySetupTokenRepository{
		tokens: make(map[[32]byte]*model.PasskeySetupToken),
	}
}

func (m *mockPasskeySetupTokenRepository) Create(
	_ context.Context,
	token *model.PasskeySetupToken,
) error {
	var key [32]byte
	copy(key[:], token.TokenHash)

	m.tokens[key] = token
	return nil
}

func (m *mockPasskeySetupTokenRepository) FindByTokenHash(
	_ context.Context,
	tokenHash []byte,
) (*model.PasskeySetupToken, error) {
	var key [32]byte
	copy(key[:], tokenHash)

	return m.tokens[key], nil
}

func (m *mockPasskeySetupTokenRepository) Consume(
	_ context.Context,
	tokenID uuid.UUID,
	now time.Time,
) (bool, error) {
	for _, token := range m.tokens {
		if token.ID != tokenID {
			continue
		}

		if token.UsedAt != nil || !now.Before(token.ExpiresAt) {
			return false, nil
		}

		token.UsedAt = &now
		return true, nil
	}

	return false, nil
}

func (m *mockPasskeySetupTokenRepository) DeleteExpired(
	_ context.Context,
	now time.Time,
) (int64, error) {
	var count int64

	for key, token := range m.tokens {
		if !now.Before(token.ExpiresAt) {
			delete(m.tokens, key)
			count++
		}
	}

	return count, nil
}

func TestIssueSetupToken(t *testing.T) {
	repo := newMockPasskeySetupTokenRepository()
	svc := NewPasskeySetupTokenService(repo)

	userID := uuid.New()

	token, err := svc.Issue(context.Background(), userID)
	if err != nil {
		t.Fatalf("Issue failed: %v", err)
	}

	decoded, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		t.Fatalf("invalid token encoding: %v", err)
	}

	if len(decoded) != 32 {
		t.Fatalf("token length = %d, want 32", len(decoded))
	}

	hash := sha256.Sum256([]byte(token))
	saved := repo.tokens[hash]

	if saved == nil {
		t.Fatal("setup token was not saved")
	}

	if saved.UserID != userID {
		t.Fatalf("user ID = %s, want %s", saved.UserID, userID)
	}

	if saved.ExpiresAt.Sub(saved.CreatedAt) != 30*time.Minute {
		t.Fatal("setup token duration must be 30 minutes")
	}

	if saved.UsedAt != nil {
		t.Fatal("new setup token must be unused")
	}
}

func TestValidateSetupToken(t *testing.T) {
	repo := newMockPasskeySetupTokenRepository()
	svc := NewPasskeySetupTokenService(repo)

	token, err := svc.Issue(context.Background(), uuid.New())
	if err != nil {
		t.Fatal(err)
	}

	saved, err := svc.Validate(context.Background(), token)
	if err != nil {
		t.Fatalf("Validate failed: %v", err)
	}

	if saved == nil {
		t.Fatal("expected valid setup token")
	}
}

func TestValidateInvalidSetupToken(t *testing.T) {
	repo := newMockPasskeySetupTokenRepository()
	svc := NewPasskeySetupTokenService(repo)

	_, err := svc.Validate(context.Background(), "invalid-token")
	if !errors.Is(err, ErrInvalidSetupToken) {
		t.Fatalf("got %v, want ErrInvalidSetupToken", err)
	}
}

func TestValidateUnknownSetupToken(t *testing.T) {
	repo := newMockPasskeySetupTokenRepository()
	svc := NewPasskeySetupTokenService(repo)

	unknown := base64.RawURLEncoding.EncodeToString(make([]byte, 32))

	_, err := svc.Validate(context.Background(), unknown)
	if !errors.Is(err, ErrInvalidSetupToken) {
		t.Fatalf("got %v, want ErrInvalidSetupToken", err)
	}
}

func TestValidateExpiredSetupToken(t *testing.T) {
	repo := newMockPasskeySetupTokenRepository()
	svc := NewPasskeySetupTokenService(repo)

	token, err := svc.Issue(context.Background(), uuid.New())
	if err != nil {
		t.Fatal(err)
	}

	hash := sha256.Sum256([]byte(token))
	repo.tokens[hash].ExpiresAt = time.Now().Add(-time.Minute)

	_, err = svc.Validate(context.Background(), token)
	if !errors.Is(err, ErrExpiredSetupToken) {
		t.Fatalf("got %v, want ErrExpiredSetupToken", err)
	}
}

func TestValidateUsedSetupToken(t *testing.T) {
	repo := newMockPasskeySetupTokenRepository()
	svc := NewPasskeySetupTokenService(repo)

	token, err := svc.Issue(context.Background(), uuid.New())
	if err != nil {
		t.Fatal(err)
	}

	hash := sha256.Sum256([]byte(token))
	saved := repo.tokens[hash]

	consumed, err := repo.Consume(
		context.Background(),
		saved.ID,
		time.Now().UTC(),
	)
	if err != nil {
		t.Fatal(err)
	}
	if !consumed {
		t.Fatal("expected token consumption to succeed")
	}

	_, err = svc.Validate(context.Background(), token)
	if !errors.Is(err, ErrInvalidSetupToken) {
		t.Fatalf("got %v, want ErrInvalidSetupToken", err)
	}

	consumed, err = repo.Consume(
		context.Background(),
		saved.ID,
		time.Now().UTC(),
	)
	if err != nil {
		t.Fatal(err)
	}
	if consumed {
		t.Fatal("used token must not be consumed twice")
	}
}

func TestIssueSetupTokenInvalidUser(t *testing.T) {
	repo := newMockPasskeySetupTokenRepository()
	svc := NewPasskeySetupTokenService(repo)

	_, err := svc.Issue(context.Background(), uuid.Nil)
	if err == nil {
		t.Fatal("expected error for invalid user ID")
	}
}

func TestIssueSetupTokensAreUnique(t *testing.T) {
	repo := newMockPasskeySetupTokenRepository()
	svc := NewPasskeySetupTokenService(repo)

	userID := uuid.New()

	first, err := svc.Issue(context.Background(), userID)
	if err != nil {
		t.Fatal(err)
	}

	second, err := svc.Issue(context.Background(), userID)
	if err != nil {
		t.Fatal(err)
	}

	if first == second {
		t.Fatal("setup tokens must be unique")
	}
}
