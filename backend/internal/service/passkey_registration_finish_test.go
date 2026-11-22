package service

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

// 登録完了テスト用Repository
type mockFinishRegistrationRepository struct {
	called bool
}

func (m *mockFinishRegistrationRepository) CompleteRegistration(
	ctx context.Context,
	userID uuid.UUID,
	setupTokenID uuid.UUID,
	challengeID uuid.UUID,
	passkey *model.Passkey,
) error {
	m.called = true
	return nil
}

// テスト用Serviceを生成します。
func newFinishRegistrationTestService(
	t *testing.T,
) (
	*PasskeyRegistrationService,
	*PasskeySetupTokenService,
	*mockWebAuthnChallengeRepository,
	*mockFinishRegistrationRepository,
) {
	t.Helper()

	authRepo := &mockRegistrationAuthRepository{}

	tokenRepo := newMockRegistrationSetupTokenRepository()
	tokenService := NewPasskeySetupTokenService(tokenRepo)

	challengeRepo := newMockWebAuthnChallengeRepository()
	challengeService := NewWebAuthnChallengeService(challengeRepo)

	finishRepo := &mockFinishRegistrationRepository{}

	registrationService := NewPasskeyRegistrationService(
		newTestRegistrationWebAuthn(t),
		authRepo,
		challengeService,
		tokenService,
		finishRepo,
	)

	return registrationService, tokenService, challengeRepo, finishRepo
}

func newTestFinishRequest() *http.Request {
	return &http.Request{
		Method: http.MethodPost,
		Header: http.Header{
			"Content-Type": []string{"application/json"},
		},
		Body: http.NoBody,
	}
}

func TestPasskeyRegistrationFinishInvalidToken(t *testing.T) {
	svc, _, _, finishRepo := newFinishRegistrationTestService(t)

	err := svc.FinishRegistration(
		context.Background(),
		"invalid-token",
		uuid.New(),
		newTestFinishRequest(),
	)

	if !errors.Is(err, ErrInvalidSetupToken) {
		t.Fatalf("expected invalid setup token, got %v", err)
	}

	if finishRepo.called {
		t.Fatal("registration must not be completed")
	}
}

func TestPasskeyRegistrationFinishUnknownToken(t *testing.T) {
	svc, _, _, finishRepo := newFinishRegistrationTestService(t)

	unknownToken := strings.Repeat("A", 43)

	err := svc.FinishRegistration(
		context.Background(),
		unknownToken,
		uuid.New(),
		newTestFinishRequest(),
	)

	if !errors.Is(err, ErrInvalidSetupToken) {
		t.Fatalf("expected invalid setup token, got %v", err)
	}

	if finishRepo.called {
		t.Fatal("registration must not be completed")
	}
}

func TestPasskeyRegistrationFinishNilRequest(t *testing.T) {
	svc, _, _, finishRepo := newFinishRegistrationTestService(t)

	err := svc.FinishRegistration(
		context.Background(),
		"invalid-token",
		uuid.New(),
		nil,
	)

	if err == nil {
		t.Fatal("expected an error for nil request")
	}

	if finishRepo.called {
		t.Fatal("registration must not be completed")
	}
}

func TestPasskeyRegistrationFinishMissingRepository(t *testing.T) {
	svc, _, _, _ := newFinishRegistrationTestService(t)

	// 登録完了Repositoryが設定されていない状態
	svc.registrationRepository = nil

	err := svc.FinishRegistration(
		context.Background(),
		"invalid-token",
		uuid.New(),
		newTestFinishRequest(),
	)

	if err == nil {
		t.Fatal("expected an error for missing repository")
	}
}

func TestPasskeyRegistrationFinishInvalidChallenge(t *testing.T) {
	ctx := context.Background()

	svc, tokenService, _, finishRepo :=
		newFinishRegistrationTestService(t)

	userID := uuid.New()

	rawToken, err := tokenService.Issue(ctx, userID)
	if err != nil {
		t.Fatal(err)
	}

	// 存在しないチャレンジIDを指定
	err = svc.FinishRegistration(
		ctx,
		rawToken,
		uuid.New(),
		newTestFinishRequest(),
	)

	if !errors.Is(err, ErrInvalidWebAuthnChallenge) {
		t.Fatalf("expected invalid challenge, got %v", err)
	}

	if finishRepo.called {
		t.Fatal("registration must not be completed")
	}
}

func TestPasskeyRegistrationFinishChallengeMismatch(t *testing.T) {
	ctx := context.Background()

	svc, tokenService, challengeRepo, finishRepo :=
		newFinishRegistrationTestService(t)

	userID := uuid.New()

	rawToken, err := tokenService.Issue(ctx, userID)
	if err != nil {
		t.Fatal(err)
	}

	// 正しいトークン情報を取得
	token, err := tokenService.Validate(ctx, rawToken)
	if err != nil {
		t.Fatal(err)
	}

	// 別のトークンIDに紐付いたチャレンジを用意
	differentTokenID := uuid.New()
	challengeID := uuid.New()

	challengeRepo.challenges[challengeID] = &model.WebAuthnChallenge{
		ID:            challengeID,
		UserID:        &userID,
		SetupTokenID:  &differentTokenID,
		ChallengeType: model.WebAuthnChallengeRegistration,
		SessionData:   testWebAuthnSessionData(),
		CreatedAt:     token.CreatedAt,
		ExpiresAt:     token.ExpiresAt,
	}

	err = svc.FinishRegistration(
		ctx,
		rawToken,
		challengeID,
		newTestFinishRequest(),
	)

	if !errors.Is(
		err,
		ErrPasskeyRegistrationChallengeMismatch,
	) {
		t.Fatalf("expected challenge mismatch, got %v", err)
	}

	if finishRepo.called {
		t.Fatal("registration must not be completed")
	}
}

func TestPasskeyRegistrationFinishExpiredChallenge(t *testing.T) {
	ctx := context.Background()

	svc, tokenService, challengeRepo, finishRepo :=
		newFinishRegistrationTestService(t)

	userID := uuid.New()

	rawToken, err := tokenService.Issue(ctx, userID)
	if err != nil {
		t.Fatal(err)
	}

	token, err := tokenService.Validate(ctx, rawToken)
	if err != nil {
		t.Fatal(err)
	}

	challengeID := uuid.New()
	now := time.Now().UTC()

	challengeRepo.challenges[challengeID] = &model.WebAuthnChallenge{
		ID:            challengeID,
		UserID:        &userID,
		SetupTokenID:  &token.ID,
		ChallengeType: model.WebAuthnChallengeRegistration,
		SessionData:   testWebAuthnSessionData(),
		CreatedAt:     now.Add(-10 * time.Minute),
		ExpiresAt:     now.Add(-5 * time.Minute),
	}

	err = svc.FinishRegistration(
		ctx,
		rawToken,
		challengeID,
		newTestFinishRequest(),
	)

	if !errors.Is(err, ErrExpiredWebAuthnChallenge) {
		t.Fatalf(
			"expected expired challenge, got %v",
			err,
		)
	}

	if finishRepo.called {
		t.Fatal("registration must not be completed")
	}
}

func TestPasskeyRegistrationFinishConsumedChallenge(t *testing.T) {
	ctx := context.Background()

	svc, tokenService, challengeRepo, finishRepo :=
		newFinishRegistrationTestService(t)

	userID := uuid.New()

	rawToken, err := tokenService.Issue(ctx, userID)
	if err != nil {
		t.Fatal(err)
	}

	token, err := tokenService.Validate(ctx, rawToken)
	if err != nil {
		t.Fatal(err)
	}

	challengeID := uuid.New()
	now := time.Now().UTC()
	consumedAt := now.Add(-time.Minute)

	challengeRepo.challenges[challengeID] = &model.WebAuthnChallenge{
		ID:            challengeID,
		UserID:        &userID,
		SetupTokenID:  &token.ID,
		ChallengeType: model.WebAuthnChallengeRegistration,
		SessionData:   testWebAuthnSessionData(),
		CreatedAt:     now.Add(-2 * time.Minute),
		ExpiresAt:     now.Add(3 * time.Minute),
		ConsumedAt:    &consumedAt,
	}

	err = svc.FinishRegistration(
		ctx,
		rawToken,
		challengeID,
		newTestFinishRequest(),
	)

	if !errors.Is(err, ErrConsumedWebAuthnChallenge) {
		t.Fatalf(
			"expected consumed challenge, got %v",
			err,
		)
	}

	if finishRepo.called {
		t.Fatal("registration must not be completed")
	}
}

func TestPasskeyRegistrationFinishUserMismatch(t *testing.T) {
	ctx := context.Background()

	svc, tokenService, challengeRepo, finishRepo :=
		newFinishRegistrationTestService(t)

	userID := uuid.New()
	differentUserID := uuid.New()

	rawToken, err := tokenService.Issue(ctx, userID)
	if err != nil {
		t.Fatal(err)
	}

	token, err := tokenService.Validate(ctx, rawToken)
	if err != nil {
		t.Fatal(err)
	}

	challengeID := uuid.New()
	now := time.Now().UTC()

	challengeRepo.challenges[challengeID] = &model.WebAuthnChallenge{
		ID:            challengeID,
		UserID:        &differentUserID,
		SetupTokenID:  &token.ID,
		ChallengeType: model.WebAuthnChallengeRegistration,
		SessionData:   testWebAuthnSessionData(),
		CreatedAt:     now,
		ExpiresAt:     now.Add(5 * time.Minute),
	}

	err = svc.FinishRegistration(
		ctx,
		rawToken,
		challengeID,
		newTestFinishRequest(),
	)

	if !errors.Is(
		err,
		ErrPasskeyRegistrationChallengeMismatch,
	) {
		t.Fatalf(
			"expected challenge mismatch, got %v",
			err,
		)
	}

	if finishRepo.called {
		t.Fatal("registration must not be completed")
	}
}

func TestPasskeyRegistrationFinishInvalidWebAuthnResponse(
	t *testing.T,
) {
	ctx := context.Background()

	svc, tokenService, challengeRepo, finishRepo :=
		newFinishRegistrationTestService(t)

	userID := uuid.New()

	// 有効な初期登録トークンを発行
	rawToken, err := tokenService.Issue(ctx, userID)
	if err != nil {
		t.Fatal(err)
	}

	token, err := tokenService.Validate(ctx, rawToken)
	if err != nil {
		t.Fatal(err)
	}

	// 有効な登録チャレンジを用意
	challengeID := uuid.New()
	now := time.Now().UTC()

	challengeRepo.challenges[challengeID] = &model.WebAuthnChallenge{
		ID:            challengeID,
		UserID:        &userID,
		SetupTokenID:  &token.ID,
		ChallengeType: model.WebAuthnChallengeRegistration,
		SessionData:   testWebAuthnSessionData(),
		CreatedAt:     now,
		ExpiresAt:     now.Add(5 * time.Minute),
	}

	// ユーザー取得が成功するように設定
	svc.authRepository = &mockRegistrationAuthRepository{
		user: &model.User{
			ID:          userID,
			MemberCode:  "A",
			DisplayName: "A",
		},
	}

	// 不正なWebAuthn登録応答
	request := httptest.NewRequest(
		http.MethodPost,
		"/auth/passkey/register/finish",
		strings.NewReader(`{"invalid":"response"}`),
	)
	request.Header.Set("Content-Type", "application/json")

	err = svc.FinishRegistration(
		ctx,
		rawToken,
		challengeID,
		request,
	)

	// WebAuthn検証に失敗すること
	if err == nil {
		t.Fatal("expected WebAuthn verification error")
	}

	// パスキー保存処理が呼ばれないこと
	if finishRepo.called {
		t.Fatal(
			"registration must not be completed when WebAuthn verification fails",
		)
	}

	// チャレンジが消費されていないこと
	challenge := challengeRepo.challenges[challengeID]

	if challenge.ConsumedAt != nil {
		t.Fatal(
			"challenge must not be consumed when WebAuthn verification fails",
		)
	}

	// 初期登録トークンが消費されていないこと
	validatedToken, err := tokenService.Validate(ctx, rawToken)
	if err != nil {
		t.Fatalf(
			"setup token must remain valid: %v",
			err,
		)
	}

	if validatedToken.UsedAt != nil {
		t.Fatal(
			"setup token must not be consumed when WebAuthn verification fails",
		)
	}
}
