package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
)

const webAuthnChallengeDuration = 5 * time.Minute

var (
	ErrInvalidWebAuthnChallenge = errors.New(
		"invalid WebAuthn challenge",
	)
	ErrExpiredWebAuthnChallenge = errors.New(
		"expired WebAuthn challenge",
	)
	ErrConsumedWebAuthnChallenge = errors.New(
		"consumed WebAuthn challenge",
	)
)

// WebAuthnChallengeServiceはチャレンジの
// 発行・検証・消費を管理します。
type WebAuthnChallengeService struct {
	repository repository.WebAuthnChallengeRepository
}

// NewWebAuthnChallengeServiceはServiceを生成します。
func NewWebAuthnChallengeService(
	repo repository.WebAuthnChallengeRepository,
) *WebAuthnChallengeService {
	return &WebAuthnChallengeService{
		repository: repo,
	}
}

// IssueはWebAuthnライブラリが生成したSessionDataを保存し、
// チャレンジ管理用IDを返します。
func (s *WebAuthnChallengeService) Issue(
	ctx context.Context,
	userID *uuid.UUID,
	setupTokenID *uuid.UUID,
	challengeType string,
	sessionData webauthn.SessionData,
) (uuid.UUID, error) {
	if challengeType != model.WebAuthnChallengeRegistration &&
		challengeType != model.WebAuthnChallengeAuthentication {
		return uuid.Nil, ErrInvalidWebAuthnChallenge
	}

	switch challengeType {
	case model.WebAuthnChallengeRegistration:
		// 登録時はユーザーと初期登録トークンが必須です。
		if userID == nil || *userID == uuid.Nil {
			return uuid.Nil, ErrInvalidWebAuthnChallenge
		}

		if setupTokenID == nil || *setupTokenID == uuid.Nil {
			return uuid.Nil, ErrInvalidWebAuthnChallenge
		}

	case model.WebAuthnChallengeAuthentication:
		// 認証時は初期登録トークンを使用しません。
		if setupTokenID != nil {
			return uuid.Nil, ErrInvalidWebAuthnChallenge
		}

		if userID != nil && *userID == uuid.Nil {
			return uuid.Nil, ErrInvalidWebAuthnChallenge
		}
	}

	if sessionData.Challenge == "" {
		return uuid.Nil, ErrInvalidWebAuthnChallenge
	}

	now := time.Now().UTC()

	challenge := &model.WebAuthnChallenge{
		ID:            uuid.New(),
		UserID:        userID,
		SetupTokenID:  setupTokenID,
		ChallengeType: challengeType,
		SessionData:   sessionData,
		CreatedAt:     now,
		ExpiresAt:     now.Add(webAuthnChallengeDuration),
	}

	if err := s.repository.Create(ctx, challenge); err != nil {
		return uuid.Nil, fmt.Errorf(
			"save WebAuthn challenge: %w",
			err,
		)
	}

	return challenge.ID, nil
}

// Validateはチャレンジの状態を確認し、
// WebAuthn検証に必要なSessionDataを取得します。
//
// このメソッドはチャレンジを消費しません。
func (s *WebAuthnChallengeService) Validate(
	ctx context.Context,
	challengeID uuid.UUID,
	expectedType string,
) (*model.WebAuthnChallenge, error) {
	if challengeID == uuid.Nil {
		return nil, ErrInvalidWebAuthnChallenge
	}

	if expectedType != model.WebAuthnChallengeRegistration &&
		expectedType != model.WebAuthnChallengeAuthentication {
		return nil, ErrInvalidWebAuthnChallenge
	}

	challenge, err := s.repository.FindByID(ctx, challengeID)
	if err != nil {
		return nil, fmt.Errorf(
			"find WebAuthn challenge: %w",
			err,
		)
	}

	if challenge == nil {
		return nil, ErrInvalidWebAuthnChallenge
	}

	if challenge.ConsumedAt != nil {
		return nil, ErrConsumedWebAuthnChallenge
	}

	now := time.Now().UTC()

	if !now.Before(challenge.ExpiresAt) {
		return nil, ErrExpiredWebAuthnChallenge
	}

	if !challenge.IsValid(now, expectedType) {
		return nil, ErrInvalidWebAuthnChallenge
	}

	if challenge.SessionData.Challenge == "" {
		return nil, ErrInvalidWebAuthnChallenge
	}

	return challenge, nil
}

// Consumeはチャレンジを原子的に使用済みにします。
func (s *WebAuthnChallengeService) Consume(
	ctx context.Context,
	challengeID uuid.UUID,
	expectedType string,
) error {
	if challengeID == uuid.Nil {
		return ErrInvalidWebAuthnChallenge
	}

	if expectedType != model.WebAuthnChallengeRegistration &&
		expectedType != model.WebAuthnChallengeAuthentication {
		return ErrInvalidWebAuthnChallenge
	}

	consumed, err := s.repository.Consume(
		ctx,
		challengeID,
		expectedType,
		time.Now().UTC(),
	)
	if err != nil {
		return fmt.Errorf(
			"consume WebAuthn challenge: %w",
			err,
		)
	}

	if !consumed {
		return ErrInvalidWebAuthnChallenge
	}

	return nil
}

// DeleteExpiredは期限切れチャレンジを削除します。
func (s *WebAuthnChallengeService) DeleteExpired(
	ctx context.Context,
) (int64, error) {
	deleted, err := s.repository.DeleteExpired(
		ctx,
		time.Now().UTC(),
	)
	if err != nil {
		return 0, fmt.Errorf(
			"delete expired WebAuthn challenges: %w",
			err,
		)
	}

	return deleted, nil
}
