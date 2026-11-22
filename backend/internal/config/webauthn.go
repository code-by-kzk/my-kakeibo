package config

import (
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"

	"github.com/go-webauthn/webauthn/webauthn"
)

// NewWebAuthnは環境変数からWebAuthnの設定を読み込みます。
func NewWebAuthn() (*webauthn.WebAuthn, error) {
	rpID := strings.TrimSpace(os.Getenv("WEBAUTHN_RP_ID"))
	rpOrigin := strings.TrimSpace(os.Getenv("WEBAUTHN_RP_ORIGIN"))

	if rpID == "" {
		return nil, errors.New("WEBAUTHN_RP_ID is required")
	}

	if rpOrigin == "" {
		return nil, errors.New("WEBAUTHN_RP_ORIGIN is required")
	}

	origin, err := url.Parse(rpOrigin)
	if err != nil {
		return nil, fmt.Errorf("invalid WEBAUTHN_RP_ORIGIN: %w", err)
	}

	// ローカル開発ではHTTPのlocalhostを許可します。
	isLocalhost := origin.Scheme == "http" &&
		origin.Hostname() == "localhost"

	if origin.Scheme != "https" && !isLocalhost {
		return nil, errors.New(
			"WEBAUTHN_RP_ORIGIN must use HTTPS (except localhost)",
		)
	}

	if origin.Host == "" ||
		origin.User != nil ||
		origin.Path != "" ||
		origin.RawQuery != "" ||
		origin.Fragment != "" {
		return nil, errors.New(
			"WEBAUTHN_RP_ORIGIN must be an origin without path, query, or fragment",
		)
	}

	if origin.Hostname() != rpID {
		return nil, errors.New(
			"WEBAUTHN_RP_ID must match the configured origin hostname",
		)
	}

	config := &webauthn.Config{
		RPDisplayName: "ふたりの家計簿",
		RPID:          rpID,
		RPOrigins:     []string{rpOrigin},
	}

	wa, err := webauthn.New(config)
	if err != nil {
		return nil, fmt.Errorf("initialize WebAuthn: %w", err)
	}

	return wa, nil
}
