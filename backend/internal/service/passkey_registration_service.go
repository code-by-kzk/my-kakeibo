package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
)

var (
	ErrPasskeyRegistrationUserNotFound = errors.New(
		"passkey registration user not found",
	)
	ErrPasskeyAlreadyRegistered = errors.New(
		"passkey already registered",
	)
	ErrPasskeyRegistrationChallengeMismatch = errors.New(
		"passkey registration challenge mismatch",
	)
)

// PasskeyRegistrationServiceはパスキー登録処理を管理します。
type PasskeyRegistrationService struct {
	webAuthn               *webauthn.WebAuthn
	authRepository         repository.AuthRepository
	challengeService       *WebAuthnChallengeService
	setupTokenService      *PasskeySetupTokenService
	registrationRepository repository.PasskeyRegistrationRepository
}

// NewPasskeyRegistrationServiceはServiceを生成します。
func NewPasskeyRegistrationService(
	wa *webauthn.WebAuthn,
	authRepo repository.AuthRepository,
	challengeService *WebAuthnChallengeService,
	setupTokenService *PasskeySetupTokenService,
	registrationRepo ...repository.PasskeyRegistrationRepository,
) *PasskeyRegistrationService {
	service := &PasskeyRegistrationService{
		webAuthn:          wa,
		authRepository:    authRepo,
		challengeService:  challengeService,
		setupTokenService: setupTokenService,
	}

	if len(registrationRepo) > 0 {
		service.registrationRepository = registrationRepo[0]
	}

	return service
}

// BeginRegistrationは初期登録トークンを検証し、
// パスキー登録オプションを生成します。
func (s *PasskeyRegistrationService) BeginRegistration(
	ctx context.Context,
	setupToken string,
) (*protocol.CredentialCreation, uuid.UUID, error) {
	if s.setupTokenService == nil {
		return nil, uuid.Nil, ErrInvalidSetupToken
	}

	token, err := s.setupTokenService.Validate(ctx, setupToken)
	if err != nil {
		return nil, uuid.Nil, err
	}

	if token == nil ||
		token.ID == uuid.Nil ||
		token.UserID == uuid.Nil {
		return nil, uuid.Nil, ErrInvalidSetupToken
	}

	userID := token.UserID
	setupTokenID := token.ID

	user, err := s.authRepository.FindUserByID(ctx, userID)
	if err != nil {
		return nil, uuid.Nil, fmt.Errorf(
			"find registration user: %w",
			err,
		)
	}

	if user == nil {
		return nil, uuid.Nil, ErrPasskeyRegistrationUserNotFound
	}

	passkeys, err := s.authRepository.FindPasskeysByUserID(
		ctx,
		userID,
	)
	if err != nil {
		return nil, uuid.Nil, fmt.Errorf(
			"find registered passkeys: %w",
			err,
		)
	}

	if len(passkeys) > 0 {
		return nil, uuid.Nil, ErrPasskeyAlreadyRegistered
	}

	options, sessionData, err := s.webAuthn.BeginRegistration(
		user,
	)
	if err != nil {
		return nil, uuid.Nil, fmt.Errorf(
			"begin WebAuthn registration: %w",
			err,
		)
	}

	challengeID, err := s.challengeService.Issue(
		ctx,
		&userID,
		&setupTokenID,
		model.WebAuthnChallengeRegistration,
		*sessionData,
	)
	if err != nil {
		return nil, uuid.Nil, fmt.Errorf(
			"save registration challenge: %w",
			err,
		)
	}

	return options, challengeID, nil
}

// FinishRegistrationはWebAuthn登録応答を検証し、
// パスキーの初期登録を確定します。
//
// requestにはブラウザから送信されたWebAuthn登録応答を
// JSON形式で格納したHTTPリクエストを渡します。
func (s *PasskeyRegistrationService) FinishRegistration(
	ctx context.Context,
	setupToken string,
	challengeID uuid.UUID,
	request *http.Request,
) error {
	if s.setupTokenService == nil {
		return ErrInvalidSetupToken
	}

	if s.registrationRepository == nil {
		return errors.New("passkey registration repository is not configured")
	}

	if request == nil {
		return errors.New("WebAuthn registration request is nil")
	}

	// 1. 初期登録トークンを再検証
	token, err := s.setupTokenService.Validate(ctx, setupToken)
	if err != nil {
		return err
	}

	if token == nil ||
		token.ID == uuid.Nil ||
		token.UserID == uuid.Nil {
		return ErrInvalidSetupToken
	}

	// 2. 登録チャレンジを検証
	challenge, err := s.challengeService.Validate(
		ctx,
		challengeID,
		model.WebAuthnChallengeRegistration,
	)
	if err != nil {
		return err
	}

	// チャレンジが同じユーザー・トークンに
	// 紐付いていることを確認
	if challenge.UserID == nil ||
		*challenge.UserID != token.UserID ||
		challenge.SetupTokenID == nil ||
		*challenge.SetupTokenID != token.ID {
		return ErrPasskeyRegistrationChallengeMismatch
	}

	// 3. 登録対象ユーザーを取得
	user, err := s.authRepository.FindUserByID(
		ctx,
		token.UserID,
	)
	if err != nil {
		return fmt.Errorf(
			"find registration user: %w",
			err,
		)
	}

	if user == nil {
		return ErrPasskeyRegistrationUserNotFound
	}

	// 4. WebAuthn登録応答を検証
	credential, err := s.webAuthn.FinishRegistration(
		user,
		challenge.SessionData,
		request,
	)
	if err != nil {
		return fmt.Errorf(
			"verify WebAuthn registration response: %w",
			err,
		)
	}

	// 5. 検証済みCredentialを保存用Passkeyに変換
	passkey, err := model.NewPasskeyFromCredential(
		token.UserID,
		credential,
	)
	if err != nil {
		return fmt.Errorf(
			"create passkey from credential: %w",
			err,
		)
	}

	// 6. トランザクションで登録を確定
	if err := s.registrationRepository.CompleteRegistration(
		ctx,
		token.UserID,
		token.ID,
		challengeID,
		passkey,
	); err != nil {
		return fmt.Errorf(
			"complete passkey registration: %w",
			err,
		)
	}

	return nil
}
