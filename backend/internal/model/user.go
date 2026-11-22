package model

import (
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
)

// Userは家計簿を利用するAさん・Bさんのユーザー情報です。
type User struct {
	ID          uuid.UUID
	MemberCode  string
	DisplayName string
	Credentials []webauthn.Credential
}

// WebAuthnのユーザーインターフェースを実装していることを確認
var _ webauthn.User = (*User)(nil)

// WebAuthnIDは認証で使用するユーザー識別子を返します。
func (u *User) WebAuthnID() []byte {
	return u.ID[:]
}

// WebAuthnNameはユーザー名を返します。
func (u *User) WebAuthnName() string {
	return u.MemberCode
}

// WebAuthnDisplayNameは画面表示用の名前を返します。
func (u *User) WebAuthnDisplayName() string {
	return u.DisplayName
}

// WebAuthnCredentialsは登録済みパスキーを返します。
func (u *User) WebAuthnCredentials() []webauthn.Credential {
	return u.Credentials
}
