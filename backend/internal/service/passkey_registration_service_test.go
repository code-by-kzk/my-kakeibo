package service

import (
	"context"
	"crypto/sha256"
	"errors"
	"testing"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

// 登録テスト用AuthRepository
type mockRegistrationAuthRepository struct {
	user     *model.User
	passkeys []model.Passkey
}

func (m *mockRegistrationAuthRepository) FindUserByID(
	ctx context.Context,
	id uuid.UUID,
) (*model.User, error) {
	if m.user != nil && m.user.ID == id {
		return m.user, nil
	}
	return nil, nil
}

func (m *mockRegistrationAuthRepository) FindUserByMemberCode(
	ctx context.Context,
	memberCode string,
) (*model.User, error) {
	if m.user != nil && m.user.MemberCode == memberCode {
		return m.user, nil
	}
	return nil, nil
}

func (m *mockRegistrationAuthRepository) FindPasskeysByUserID(
	ctx context.Context,
	userID uuid.UUID,
) ([]model.Passkey, error) {
	return m.passkeys, nil
}

func (m *mockRegistrationAuthRepository) FindPasskeyByCredentialID(
	ctx context.Context,
	credentialID []byte,
) (*model.Passkey, error) {
	return nil, nil
}

func (m *mockRegistrationAuthRepository) CreatePasskey(
	ctx context.Context,
	passkey *model.Passkey,
) error {
	return nil
}

func (m *mockRegistrationAuthRepository) UpdatePasskey(
	ctx context.Context,
	passkey *model.Passkey,
) error {
	return nil
}

// 登録テスト用SetupTokenRepository
type mockRegistrationSetupTokenRepository struct {
	tokens map[[32]byte]*model.PasskeySetupToken
}

func newMockRegistrationSetupTokenRepository() *mockRegistrationSetupTokenRepository {
	return &mockRegistrationSetupTokenRepository{
		tokens: make(map[[32]byte]*model.PasskeySetupToken),
	}
}

func (m *mockRegistrationSetupTokenRepository) Create(
	ctx context.Context,
	token *model.PasskeySetupToken,
) error {
	var hash [32]byte
	copy(hash[:], token.TokenHash)

	m.tokens[hash] = token
	return nil
}

func (m *mockRegistrationSetupTokenRepository) FindByTokenHash(
	ctx context.Context,
	tokenHash []byte,
) (*model.PasskeySetupToken, error) {
	var hash [32]byte
	copy(hash[:], tokenHash)

	return m.tokens[hash], nil
}

func (m *mockRegistrationSetupTokenRepository) Consume(
	ctx context.Context,
	id uuid.UUID,
	now time.Time,
) (bool, error) {
	for _, token := range m.tokens {
		if token.ID != id {
			continue
		}

		if !token.IsValid(now) {
			return false, nil
		}

		usedAt := now
		token.UsedAt = &usedAt
		return true, nil
	}

	return false, nil
}

func (m *mockRegistrationSetupTokenRepository) DeleteExpired(
	ctx context.Context,
	now time.Time,
) (int64, error) {
	var deleted int64

	for hash, token := range m.tokens {
		if !now.Before(token.ExpiresAt) {
			delete(m.tokens, hash)
			deleted++
		}
	}

	return deleted, nil
}

// テスト用WebAuthnインスタンス
func newTestRegistrationWebAuthn(t *testing.T) *webauthn.WebAuthn {
	t.Helper()

	wa, err := webauthn.New(&webauthn.Config{
		RPDisplayName: "ふたりの家計簿",
		RPID:          "localhost",
		RPOrigins:     []string{"http://localhost:5173"},
	})
	if err != nil {
		t.Fatalf("create WebAuthn: %v", err)
	}

	return wa
}

// テスト環境を生成
func newRegistrationTestServices(
	t *testing.T,
	authRepo *mockRegistrationAuthRepository,
) (
	*PasskeyRegistrationService,
	*PasskeySetupTokenService,
	*mockRegistrationSetupTokenRepository,
	*mockWebAuthnChallengeRepository,
) {
	t.Helper()

	tokenRepo := newMockRegistrationSetupTokenRepository()
	tokenService := NewPasskeySetupTokenService(tokenRepo)

	challengeRepo := newMockWebAuthnChallengeRepository()
	challengeService := NewWebAuthnChallengeService(challengeRepo)

	registrationService := NewPasskeyRegistrationService(
		newTestRegistrationWebAuthn(t),
		authRepo,
		challengeService,
		tokenService,
	)

	return registrationService, tokenService, tokenRepo, challengeRepo
}

// 発行済みトークンに対応するDBレコードを取得
func findRegistrationTestToken(
	t *testing.T,
	repo *mockRegistrationSetupTokenRepository,
	rawToken string,
) *model.PasskeySetupToken {
	t.Helper()

	hash := sha256.Sum256([]byte(rawToken))
	token := repo.tokens[hash]

	if token == nil {
		t.Fatal("issued setup token was not saved")
	}

	return token
}

func TestPasskeyRegistrationBeginSuccess(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	authRepo := &mockRegistrationAuthRepository{
		user: &model.User{
			ID:          userID,
			MemberCode:  "A",
			DisplayName: "A",
		},
	}

	registrationService, tokenService, tokenRepo, challengeRepo :=
		newRegistrationTestServices(t, authRepo)

	rawToken, err := tokenService.Issue(ctx, userID)
	if err != nil {
		t.Fatalf("Issue failed: %v", err)
	}

	options, challengeID, err := registrationService.BeginRegistration(
		ctx,
		rawToken,
	)
	if err != nil {
		t.Fatalf("BeginRegistration failed: %v", err)
	}

	if options == nil {
		t.Fatal("expected registration options")
	}

	if challengeID == uuid.Nil {
		t.Fatal("expected challenge ID")
	}

	saved := challengeRepo.challenges[challengeID]
	if saved == nil {
		t.Fatal("registration challenge was not saved")
	}

	token := findRegistrationTestToken(t, tokenRepo, rawToken)

	if saved.ChallengeType != model.WebAuthnChallengeRegistration {
		t.Fatalf("unexpected challenge type: %s", saved.ChallengeType)
	}

	if saved.UserID == nil || *saved.UserID != userID {
		t.Fatal("unexpected challenge user ID")
	}

	if saved.SetupTokenID == nil || *saved.SetupTokenID != token.ID {
		t.Fatal("unexpected setup token ID")
	}

	if saved.SessionData.Challenge == "" {
		t.Fatal("expected non-empty WebAuthn challenge")
	}

	if token.UsedAt != nil {
		t.Fatal("registration begin must not consume setup token")
	}
}

func TestPasskeyRegistrationBeginInvalidToken(t *testing.T) {
	registrationService, _, _, challengeRepo :=
		newRegistrationTestServices(
			t,
			&mockRegistrationAuthRepository{},
		)

	_, _, err := registrationService.BeginRegistration(
		context.Background(),
		"invalid-token",
	)

	if !errors.Is(err, ErrInvalidSetupToken) {
		t.Fatalf("expected invalid setup token error, got %v", err)
	}

	if len(challengeRepo.challenges) != 0 {
		t.Fatal("challenge must not be created")
	}
}

func TestPasskeyRegistrationBeginUnknownToken(t *testing.T) {
	ctx := context.Background()

	registrationService, _, _, challengeRepo :=
		newRegistrationTestServices(
			t,
			&mockRegistrationAuthRepository{},
		)

	// 形式は正しいがDBに存在しないトークン
	unknownToken := "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

	_, _, err := registrationService.BeginRegistration(
		ctx,
		unknownToken,
	)

	if !errors.Is(err, ErrInvalidSetupToken) {
		t.Fatalf("expected invalid setup token error, got %v", err)
	}

	if len(challengeRepo.challenges) != 0 {
		t.Fatal("challenge must not be created")
	}
}

func TestPasskeyRegistrationBeginExpiredToken(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	authRepo := &mockRegistrationAuthRepository{
		user: &model.User{
			ID:          userID,
			MemberCode:  "A",
			DisplayName: "A",
		},
	}

	registrationService, tokenService, tokenRepo, challengeRepo :=
		newRegistrationTestServices(t, authRepo)

	rawToken, err := tokenService.Issue(ctx, userID)
	if err != nil {
		t.Fatal(err)
	}

	token := findRegistrationTestToken(t, tokenRepo, rawToken)
	token.ExpiresAt = time.Now().UTC().Add(-time.Minute)

	_, _, err = registrationService.BeginRegistration(ctx, rawToken)

	if !errors.Is(err, ErrExpiredSetupToken) {
		t.Fatalf("expected expired setup token error, got %v", err)
	}

	if len(challengeRepo.challenges) != 0 {
		t.Fatal("challenge must not be created")
	}
}

func TestPasskeyRegistrationBeginUsedToken(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	authRepo := &mockRegistrationAuthRepository{
		user: &model.User{
			ID:          userID,
			MemberCode:  "A",
			DisplayName: "A",
		},
	}

	registrationService, tokenService, tokenRepo, challengeRepo :=
		newRegistrationTestServices(t, authRepo)

	rawToken, err := tokenService.Issue(ctx, userID)
	if err != nil {
		t.Fatal(err)
	}

	token := findRegistrationTestToken(t, tokenRepo, rawToken)
	usedAt := time.Now().UTC()
	token.UsedAt = &usedAt

	_, _, err = registrationService.BeginRegistration(ctx, rawToken)

	if !errors.Is(err, ErrInvalidSetupToken) {
		t.Fatalf("expected invalid setup token error, got %v", err)
	}

	if len(challengeRepo.challenges) != 0 {
		t.Fatal("challenge must not be created")
	}
}

func TestPasskeyRegistrationBeginUserNotFound(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	registrationService, tokenService, _, challengeRepo :=
		newRegistrationTestServices(
			t,
			&mockRegistrationAuthRepository{},
		)

	rawToken, err := tokenService.Issue(ctx, userID)
	if err != nil {
		t.Fatal(err)
	}

	_, _, err = registrationService.BeginRegistration(ctx, rawToken)

	if !errors.Is(err, ErrPasskeyRegistrationUserNotFound) {
		t.Fatalf("expected user not found error, got %v", err)
	}

	if len(challengeRepo.challenges) != 0 {
		t.Fatal("challenge must not be created")
	}
}

func TestPasskeyRegistrationBeginAlreadyRegistered(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	authRepo := &mockRegistrationAuthRepository{
		user: &model.User{
			ID:          userID,
			MemberCode:  "A",
			DisplayName: "A",
		},
		passkeys: []model.Passkey{
			{
				ID:     uuid.New(),
				UserID: userID,
			},
		},
	}

	registrationService, tokenService, _, challengeRepo :=
		newRegistrationTestServices(t, authRepo)

	rawToken, err := tokenService.Issue(ctx, userID)
	if err != nil {
		t.Fatal(err)
	}

	_, _, err = registrationService.BeginRegistration(ctx, rawToken)

	if !errors.Is(err, ErrPasskeyAlreadyRegistered) {
		t.Fatalf("expected already registered error, got %v", err)
	}

	if len(challengeRepo.challenges) != 0 {
		t.Fatal("challenge must not be created")
	}
}
