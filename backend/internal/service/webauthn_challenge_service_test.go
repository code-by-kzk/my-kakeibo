package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

// テスト用Repository
type mockWebAuthnChallengeRepository struct {
	challenges map[uuid.UUID]*model.WebAuthnChallenge
}

func newMockWebAuthnChallengeRepository() *mockWebAuthnChallengeRepository {
	return &mockWebAuthnChallengeRepository{
		challenges: make(map[uuid.UUID]*model.WebAuthnChallenge),
	}
}

func (m *mockWebAuthnChallengeRepository) Create(
	ctx context.Context,
	challenge *model.WebAuthnChallenge,
) error {
	m.challenges[challenge.ID] = challenge
	return nil
}

func (m *mockWebAuthnChallengeRepository) FindByID(
	ctx context.Context,
	id uuid.UUID,
) (*model.WebAuthnChallenge, error) {
	return m.challenges[id], nil
}

func (m *mockWebAuthnChallengeRepository) Consume(
	ctx context.Context,
	id uuid.UUID,
	expectedType string,
	now time.Time,
) (bool, error) {
	challenge := m.challenges[id]
	if challenge == nil {
		return false, nil
	}

	if !challenge.IsValid(now, expectedType) {
		return false, nil
	}

	consumedAt := now
	challenge.ConsumedAt = &consumedAt

	return true, nil
}

func (m *mockWebAuthnChallengeRepository) DeleteExpired(
	ctx context.Context,
	now time.Time,
) (int64, error) {
	var deleted int64

	for id, challenge := range m.challenges {
		if !now.Before(challenge.ExpiresAt) {
			delete(m.challenges, id)
			deleted++
		}
	}

	return deleted, nil
}

// テスト用SessionData
func testWebAuthnSessionData() webauthn.SessionData {
	return webauthn.SessionData{
		Challenge: "test-challenge",
	}
}

func TestWebAuthnChallengeIssue(t *testing.T) {
	repo := newMockWebAuthnChallengeRepository()
	svc := NewWebAuthnChallengeService(repo)

	userID := uuid.New()
	setupTokenID := uuid.New()

	id, err := svc.Issue(
		context.Background(),
		&userID,
		&setupTokenID,
		model.WebAuthnChallengeRegistration,
		testWebAuthnSessionData(),
	)
	if err != nil {
		t.Fatalf("Issue failed: %v", err)
	}

	if id == uuid.Nil {
		t.Fatal("expected non-nil challenge ID")
	}

	challenge := repo.challenges[id]
	if challenge == nil {
		t.Fatal("challenge was not saved")
	}

	if challenge.ChallengeType != model.WebAuthnChallengeRegistration {
		t.Fatal("unexpected challenge type")
	}

	if challenge.UserID == nil || *challenge.UserID != userID {
		t.Fatal("unexpected user ID")
	}

	if challenge.SetupTokenID == nil ||
		*challenge.SetupTokenID != setupTokenID {
		t.Fatal("unexpected setup token ID")
	}

	duration := challenge.ExpiresAt.Sub(challenge.CreatedAt)
	if duration != 5*time.Minute {
		t.Fatalf("unexpected duration: %v", duration)
	}
}

func TestWebAuthnChallengeIssueRejectsInvalidInput(t *testing.T) {
	userID := uuid.New()
	setupTokenID := uuid.New()
	nilID := uuid.Nil

	tests := []struct {
		name          string
		userID        *uuid.UUID
		setupTokenID  *uuid.UUID
		challengeType string
		sessionData   webauthn.SessionData
	}{
		{
			name:          "unknown type",
			userID:        &userID,
			setupTokenID:  &setupTokenID,
			challengeType: "unknown",
			sessionData:   testWebAuthnSessionData(),
		},
		{
			name:          "registration without user",
			setupTokenID:  &setupTokenID,
			challengeType: model.WebAuthnChallengeRegistration,
			sessionData:   testWebAuthnSessionData(),
		},
		{
			name:          "registration without setup token",
			userID:        &userID,
			challengeType: model.WebAuthnChallengeRegistration,
			sessionData:   testWebAuthnSessionData(),
		},
		{
			name:          "registration with nil setup token UUID",
			userID:        &userID,
			setupTokenID:  &nilID,
			challengeType: model.WebAuthnChallengeRegistration,
			sessionData:   testWebAuthnSessionData(),
		},
		{
			name:          "authentication with setup token",
			setupTokenID:  &setupTokenID,
			challengeType: model.WebAuthnChallengeAuthentication,
			sessionData:   testWebAuthnSessionData(),
		},
		{
			name:          "empty challenge",
			challengeType: model.WebAuthnChallengeAuthentication,
			sessionData:   webauthn.SessionData{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newMockWebAuthnChallengeRepository()
			svc := NewWebAuthnChallengeService(repo)

			_, err := svc.Issue(
				context.Background(),
				tt.userID,
				tt.setupTokenID,
				tt.challengeType,
				tt.sessionData,
			)

			if !errors.Is(err, ErrInvalidWebAuthnChallenge) {
				t.Fatalf("expected invalid challenge error, got %v", err)
			}

			if len(repo.challenges) != 0 {
				t.Fatal("invalid challenge should not be saved")
			}
		})
	}
}

func TestWebAuthnChallengeValidate(t *testing.T) {
	repo := newMockWebAuthnChallengeRepository()
	svc := NewWebAuthnChallengeService(repo)

	userID := uuid.New()
	setupTokenID := uuid.New()

	id, err := svc.Issue(
		context.Background(),
		&userID,
		&setupTokenID,
		model.WebAuthnChallengeRegistration,
		testWebAuthnSessionData(),
	)
	if err != nil {
		t.Fatal(err)
	}

	challenge, err := svc.Validate(
		context.Background(),
		id,
		model.WebAuthnChallengeRegistration,
	)
	if err != nil {
		t.Fatalf("Validate failed: %v", err)
	}

	if challenge.ID != id {
		t.Fatal("unexpected challenge ID")
	}

	if challenge.ConsumedAt != nil {
		t.Fatal("Validate must not consume the challenge")
	}
}

func TestWebAuthnChallengeValidateRejectsWrongType(t *testing.T) {
	repo := newMockWebAuthnChallengeRepository()
	svc := NewWebAuthnChallengeService(repo)

	userID := uuid.New()
	setupTokenID := uuid.New()

	id, err := svc.Issue(
		context.Background(),
		&userID,
		&setupTokenID,
		model.WebAuthnChallengeRegistration,
		testWebAuthnSessionData(),
	)
	if err != nil {
		t.Fatal(err)
	}

	_, err = svc.Validate(
		context.Background(),
		id,
		model.WebAuthnChallengeAuthentication,
	)

	if !errors.Is(err, ErrInvalidWebAuthnChallenge) {
		t.Fatalf("expected invalid challenge error, got %v", err)
	}
}

func TestWebAuthnChallengeValidateRejectsExpired(t *testing.T) {
	repo := newMockWebAuthnChallengeRepository()
	svc := NewWebAuthnChallengeService(repo)

	id := uuid.New()
	userID := uuid.New()
	setupTokenID := uuid.New()

	repo.challenges[id] = &model.WebAuthnChallenge{
		ID:            id,
		UserID:        &userID,
		SetupTokenID:  &setupTokenID,
		ChallengeType: model.WebAuthnChallengeRegistration,
		SessionData:   testWebAuthnSessionData(),
		CreatedAt:     time.Now().Add(-10 * time.Minute),
		ExpiresAt:     time.Now().Add(-5 * time.Minute),
	}

	_, err := svc.Validate(
		context.Background(),
		id,
		model.WebAuthnChallengeRegistration,
	)

	if !errors.Is(err, ErrExpiredWebAuthnChallenge) {
		t.Fatalf("expected expired challenge error, got %v", err)
	}
}

func TestWebAuthnChallengeConsume(t *testing.T) {
	repo := newMockWebAuthnChallengeRepository()
	svc := NewWebAuthnChallengeService(repo)

	userID := uuid.New()
	setupTokenID := uuid.New()

	id, err := svc.Issue(
		context.Background(),
		&userID,
		&setupTokenID,
		model.WebAuthnChallengeRegistration,
		testWebAuthnSessionData(),
	)
	if err != nil {
		t.Fatal(err)
	}

	err = svc.Consume(
		context.Background(),
		id,
		model.WebAuthnChallengeRegistration,
	)
	if err != nil {
		t.Fatalf("first Consume failed: %v", err)
	}

	err = svc.Consume(
		context.Background(),
		id,
		model.WebAuthnChallengeRegistration,
	)
	if !errors.Is(err, ErrInvalidWebAuthnChallenge) {
		t.Fatalf("expected second Consume to fail, got %v", err)
	}
}

func TestWebAuthnChallengeDeleteExpired(t *testing.T) {
	repo := newMockWebAuthnChallengeRepository()
	svc := NewWebAuthnChallengeService(repo)

	now := time.Now()

	expiredID := uuid.New()
	activeID := uuid.New()

	repo.challenges[expiredID] = &model.WebAuthnChallenge{
		ID:        expiredID,
		ExpiresAt: now.Add(-time.Minute),
	}

	repo.challenges[activeID] = &model.WebAuthnChallenge{
		ID:        activeID,
		ExpiresAt: now.Add(time.Minute),
	}

	deleted, err := svc.DeleteExpired(context.Background())
	if err != nil {
		t.Fatalf("DeleteExpired failed: %v", err)
	}

	if deleted != 1 {
		t.Fatalf("expected 1 deleted challenge, got %d", deleted)
	}

	if repo.challenges[expiredID] != nil {
		t.Fatal("expired challenge was not deleted")
	}

	if repo.challenges[activeID] == nil {
		t.Fatal("active challenge was deleted")
	}
}
