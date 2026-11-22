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
	ErrPasskeyLoginInvalid       = errors.New("invalid passkey login")
	ErrPasskeyLoginUserNotFound  = errors.New("login user not found")
	ErrPasskeyLoginNotRegistered = errors.New("passkey not registered")
)

type PasskeyLoginService struct {
	webAuthn         *webauthn.WebAuthn
	authRepository   repository.AuthRepository
	challengeService *WebAuthnChallengeService
	sessionService   *SessionService
}

func NewPasskeyLoginService(
	wa *webauthn.WebAuthn,
	authRepo repository.AuthRepository,
	challengeService *WebAuthnChallengeService,
	sessionService *SessionService,
) *PasskeyLoginService {
	return &PasskeyLoginService{
		webAuthn:         wa,
		authRepository:   authRepo,
		challengeService: challengeService,
		sessionService:   sessionService,
	}
}

func (s *PasskeyLoginService) loadUserWithCredentials(
	ctx context.Context,
	userID uuid.UUID,
) (*model.User, error) {
	user, err := s.authRepository.FindUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrPasskeyLoginUserNotFound
	}

	passkeys, err := s.authRepository.FindPasskeysByUserID(
		ctx, user.ID,
	)
	if err != nil {
		return nil, err
	}
	if len(passkeys) == 0 {
		return nil, ErrPasskeyLoginNotRegistered
	}

	for _, passkey := range passkeys {
		credential, err := passkey.ToWebAuthnCredential()
		if err != nil {
			return nil, fmt.Errorf(
				"decode credential: %w", err,
			)
		}
		user.Credentials = append(
			user.Credentials, credential,
		)
	}

	return user, nil
}

func (s *PasskeyLoginService) BeginLogin(
	ctx context.Context,
	memberCode string,
) (*protocol.CredentialAssertion, uuid.UUID, error) {
	if memberCode != "A" && memberCode != "B" {
		return nil, uuid.Nil, ErrPasskeyLoginInvalid
	}

	user, err := s.authRepository.FindUserByMemberCode(
		ctx, memberCode,
	)
	if err != nil {
		return nil, uuid.Nil, err
	}
	if user == nil {
		return nil, uuid.Nil, ErrPasskeyLoginUserNotFound
	}

	user, err = s.loadUserWithCredentials(ctx, user.ID)
	if err != nil {
		return nil, uuid.Nil, err
	}

	options, sessionData, err := s.webAuthn.BeginLogin(user)
	if err != nil {
		return nil, uuid.Nil, fmt.Errorf(
			"begin WebAuthn login: %w", err,
		)
	}

	challengeID, err := s.challengeService.Issue(
		ctx,
		&user.ID,
		nil,
		model.WebAuthnChallengeAuthentication,
		*sessionData,
	)
	if err != nil {
		return nil, uuid.Nil, err
	}

	return options, challengeID, nil
}

func (s *PasskeyLoginService) FinishLogin(
	ctx context.Context,
	challengeID uuid.UUID,
	request *http.Request,
) (string, error) {
	challenge, err := s.challengeService.Validate(
		ctx,
		challengeID,
		model.WebAuthnChallengeAuthentication,
	)
	if err != nil {
		return "", ErrPasskeyLoginInvalid
	}

	if challenge.UserID == nil {
		return "", ErrPasskeyLoginInvalid
	}

	user, err := s.loadUserWithCredentials(
		ctx, *challenge.UserID,
	)
	if err != nil {
		return "", err
	}

	credential, err := s.webAuthn.FinishLogin(
		user,
		challenge.SessionData,
		request,
	)
	if err != nil {
		return "", ErrPasskeyLoginInvalid
	}

	passkey, err := s.authRepository.FindPasskeyByCredentialID(
		ctx,
		credential.ID,
	)
	if err != nil {
		return "", err
	}
	if passkey == nil || passkey.UserID != user.ID {
		return "", ErrPasskeyLoginInvalid
	}

	// チャレンジの再利用を防ぐ。
	if err := s.challengeService.Consume(
		ctx,
		challengeID,
		model.WebAuthnChallengeAuthentication,
	); err != nil {
		return "", ErrPasskeyLoginInvalid
	}

	updated, err := model.NewPasskeyFromCredential(
		user.ID,
		credential,
	)
	if err != nil {
		return "", err
	}

	passkey.SignCount = updated.SignCount
	passkey.CredentialData = updated.CredentialData

	if err := s.authRepository.UpdatePasskey(
		ctx, passkey,
	); err != nil {
		return "", err
	}

	token, err := s.sessionService.CreateSession(
		ctx, user.ID,
	)
	if err != nil {
		return "", err
	}

	return token, nil
}
