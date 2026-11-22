package model

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
)

// PasskeyはPostgreSQLに保存するパスキー情報です。
type Passkey struct {
	ID             uuid.UUID
	UserID         uuid.UUID
	CredentialID   []byte
	PublicKey      []byte
	SignCount      uint32
	CredentialData []byte
	Name           string
	CreatedAt      time.Time
	LastUsedAt     *time.Time
}

// ToWebAuthnCredentialは保存済みの認証情報を
// WebAuthnライブラリの形式に変換します。
func (p *Passkey) ToWebAuthnCredential() (
	webauthn.Credential,
	error,
) {
	var credential webauthn.Credential

	if err := credential.UnmarshalJSON(p.CredentialData); err != nil {
		return webauthn.Credential{}, err
	}

	return credential, nil
}

// NewPasskeyFromCredentialは、WebAuthnで検証済みの
// Credentialから保存用のPasskeyを生成します。
//
// credentialは必ずWebAuthnライブラリによる
// 登録応答の検証後に渡してください。
func NewPasskeyFromCredential(
	userID uuid.UUID,
	credential *webauthn.Credential,
) (*Passkey, error) {
	if userID == uuid.Nil {
		return nil, errors.New("invalid passkey user ID")
	}

	if credential == nil {
		return nil, errors.New("WebAuthn credential is nil")
	}

	if len(credential.ID) == 0 {
		return nil, errors.New("WebAuthn credential ID is empty")
	}

	if len(credential.PublicKey) == 0 {
		return nil, errors.New("WebAuthn public key is empty")
	}

	credentialData, err := json.Marshal(credential)
	if err != nil {
		return nil, fmt.Errorf(
			"marshal WebAuthn credential: %w",
			err,
		)
	}

	passkey := &Passkey{
		ID:             uuid.New(),
		UserID:         userID,
		CredentialID:   append([]byte(nil), credential.ID...),
		PublicKey:      append([]byte(nil), credential.PublicKey...),
		SignCount:      credential.Authenticator.SignCount,
		CredentialData: credentialData,
		Name:           "パスキー",
	}

	return passkey, nil
}
