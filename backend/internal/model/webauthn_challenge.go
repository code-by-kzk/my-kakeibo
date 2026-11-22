package model

import (
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
)

// WebAuthnチャレンジの種類
const (
	WebAuthnChallengeRegistration   = "registration"
	WebAuthnChallengeAuthentication = "authentication"
)

// WebAuthnChallengeはパスキー登録・認証時に
// 使用する一時的なチャレンジ情報です。
type WebAuthnChallenge struct {
	ID            uuid.UUID
	UserID        *uuid.UUID
	SetupTokenID  *uuid.UUID
	ChallengeType string
	SessionData   webauthn.SessionData
	CreatedAt     time.Time
	ExpiresAt     time.Time
	ConsumedAt    *time.Time
}

// IsValidはチャレンジが使用可能か判定します。
func (c *WebAuthnChallenge) IsValid(
	now time.Time,
	expectedType string,
) bool {
	if c == nil {
		return false
	}

	if c.ID == uuid.Nil {
		return false
	}

	// 使用済みのチャレンジは無効
	if c.ConsumedAt != nil {
		return false
	}

	// 有効期限切れのチャレンジは無効
	if !now.Before(c.ExpiresAt) {
		return false
	}

	// 登録用と認証用の取り違えを防止
	if c.ChallengeType != expectedType {
		return false
	}

	switch c.ChallengeType {
	case WebAuthnChallengeRegistration:
		// 登録用チャレンジにはユーザーIDと
		// 初期登録トークンIDの両方が必要です。
		if c.UserID == nil || *c.UserID == uuid.Nil {
			return false
		}

		if c.SetupTokenID == nil || *c.SetupTokenID == uuid.Nil {
			return false
		}

	case WebAuthnChallengeAuthentication:
		// 認証用チャレンジには初期登録トークンを紐付けません。
		if c.SetupTokenID != nil {
			return false
		}

		// ユーザーIDが指定されている場合は妥当性を確認します。
		if c.UserID != nil && *c.UserID == uuid.Nil {
			return false
		}

	default:
		return false
	}

	return true
}
