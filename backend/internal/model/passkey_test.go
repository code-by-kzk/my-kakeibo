package model

import (
	"bytes"
	"encoding/json"
	"testing"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
)

func TestNewPasskeyFromCredentialSuccess(t *testing.T) {
	userID := uuid.New()

	credential := &webauthn.Credential{
		ID:        []byte{1, 2, 3, 4},
		PublicKey: []byte{5, 6, 7, 8},
	}

	credential.Authenticator.SignCount = 10

	passkey, err := NewPasskeyFromCredential(
		userID,
		credential,
	)
	if err != nil {
		t.Fatalf("NewPasskeyFromCredential failed: %v", err)
	}

	if passkey.ID == uuid.Nil {
		t.Fatal("expected non-nil passkey ID")
	}

	if passkey.UserID != userID {
		t.Fatal("unexpected user ID")
	}

	if !bytes.Equal(passkey.CredentialID, credential.ID) {
		t.Fatal("unexpected credential ID")
	}

	if !bytes.Equal(passkey.PublicKey, credential.PublicKey) {
		t.Fatal("unexpected public key")
	}

	if passkey.SignCount != 10 {
		t.Fatalf(
			"unexpected sign count: %d",
			passkey.SignCount,
		)
	}

	if passkey.Name != "パスキー" {
		t.Fatalf("unexpected passkey name: %s", passkey.Name)
	}

	if !json.Valid(passkey.CredentialData) {
		t.Fatal("credential data must be valid JSON")
	}

	restored, err := passkey.ToWebAuthnCredential()
	if err != nil {
		t.Fatalf("restore credential failed: %v", err)
	}

	if !bytes.Equal(restored.ID, credential.ID) {
		t.Fatal("restored credential ID does not match")
	}

	if !bytes.Equal(restored.PublicKey, credential.PublicKey) {
		t.Fatal("restored public key does not match")
	}

	if restored.Authenticator.SignCount != 10 {
		t.Fatal("restored sign count does not match")
	}
}

func TestNewPasskeyFromCredentialInvalidInput(t *testing.T) {
	validCredential := func() *webauthn.Credential {
		return &webauthn.Credential{
			ID:        []byte{1, 2, 3},
			PublicKey: []byte{4, 5, 6},
		}
	}

	tests := []struct {
		name       string
		userID     uuid.UUID
		credential *webauthn.Credential
	}{
		{
			name:       "invalid user ID",
			userID:     uuid.Nil,
			credential: validCredential(),
		},
		{
			name:       "nil credential",
			userID:     uuid.New(),
			credential: nil,
		},
		{
			name:   "empty credential ID",
			userID: uuid.New(),
			credential: &webauthn.Credential{
				PublicKey: []byte{4, 5, 6},
			},
		},
		{
			name:   "empty public key",
			userID: uuid.New(),
			credential: &webauthn.Credential{
				ID: []byte{1, 2, 3},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			passkey, err := NewPasskeyFromCredential(
				tt.userID,
				tt.credential,
			)

			if err == nil {
				t.Fatal("expected an error")
			}

			if passkey != nil {
				t.Fatal("expected nil passkey")
			}
		})
	}
}

func TestNewPasskeyFromCredentialCopiesByteSlices(t *testing.T) {
	credential := &webauthn.Credential{
		ID:        []byte{1, 2, 3},
		PublicKey: []byte{4, 5, 6},
	}

	passkey, err := NewPasskeyFromCredential(
		uuid.New(),
		credential,
	)
	if err != nil {
		t.Fatal(err)
	}

	// 元のCredentialを書き換える
	credential.ID[0] = 99
	credential.PublicKey[0] = 99

	// 保存用Passkeyには影響しない
	if passkey.CredentialID[0] != 1 {
		t.Fatal("credential ID was not copied")
	}

	if passkey.PublicKey[0] != 4 {
		t.Fatal("public key was not copied")
	}
}
