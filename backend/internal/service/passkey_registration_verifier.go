package service

import (
	"net/http"

	"github.com/go-webauthn/webauthn/webauthn"
)

// PasskeyRegistrationVerifierはWebAuthnの
// 登録応答を検証するインターフェースです。
type PasskeyRegistrationVerifier interface {
	FinishRegistration(
		user webauthn.User,
		session webauthn.SessionData,
		request *http.Request,
	) (*webauthn.Credential, error)
}

// WebAuthnRegistrationVerifierは本番用の実装です。
type WebAuthnRegistrationVerifier struct {
	webAuthn *webauthn.WebAuthn
}

// NewWebAuthnRegistrationVerifierは本番用Verifierを生成します。
func NewWebAuthnRegistrationVerifier(
	wa *webauthn.WebAuthn,
) *WebAuthnRegistrationVerifier {
	return &WebAuthnRegistrationVerifier{
		webAuthn: wa,
	}
}

// FinishRegistrationはWebAuthnライブラリで
// 登録応答を検証します。
func (v *WebAuthnRegistrationVerifier) FinishRegistration(
	user webauthn.User,
	session webauthn.SessionData,
	request *http.Request,
) (*webauthn.Credential, error) {
	return v.webAuthn.FinishRegistration(
		user,
		session,
		request,
	)
}

var _ PasskeyRegistrationVerifier = (*WebAuthnRegistrationVerifier)(nil)
