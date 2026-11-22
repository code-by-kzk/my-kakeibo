package config

import (
	"strings"
	"testing"
)

func TestNewWebAuthn(t *testing.T) {
	tests := []struct {
		name       string
		rpID       string
		rpOrigin   string
		wantErr    bool
		errMessage string
	}{
		{
			name:     "valid localhost",
			rpID:     "localhost",
			rpOrigin: "http://localhost:5173",
		},
		{
			name:     "valid production HTTPS",
			rpID:     "example.com",
			rpOrigin: "https://example.com",
		},
		{
			name:       "missing RP ID",
			rpOrigin:   "http://localhost:5173",
			wantErr:    true,
			errMessage: "WEBAUTHN_RP_ID is required",
		},
		{
			name:       "missing origin",
			rpID:       "localhost",
			wantErr:    true,
			errMessage: "WEBAUTHN_RP_ORIGIN is required",
		},
		{
			name:       "HTTP on production domain",
			rpID:       "example.com",
			rpOrigin:   "http://example.com",
			wantErr:    true,
			errMessage: "must use HTTPS",
		},
		{
			name:       "RP ID mismatch",
			rpID:       "example.com",
			rpOrigin:   "https://other.example.com",
			wantErr:    true,
			errMessage: "must match",
		},
		{
			name:       "origin with path",
			rpID:       "example.com",
			rpOrigin:   "https://example.com/login",
			wantErr:    true,
			errMessage: "without path",
		},
		{
			name:       "origin with query",
			rpID:       "example.com",
			rpOrigin:   "https://example.com?foo=bar",
			wantErr:    true,
			errMessage: "without path",
		},
		{
			name:       "origin with fragment",
			rpID:       "example.com",
			rpOrigin:   "https://example.com#login",
			wantErr:    true,
			errMessage: "without path",
		},
		{
			name:       "origin with credentials",
			rpID:       "example.com",
			rpOrigin:   "https://user:pass@example.com",
			wantErr:    true,
			errMessage: "without path",
		},
		{
			name:       "invalid origin",
			rpID:       "localhost",
			rpOrigin:   "://invalid",
			wantErr:    true,
			errMessage: "invalid WEBAUTHN_RP_ORIGIN",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("WEBAUTHN_RP_ID", tt.rpID)
			t.Setenv("WEBAUTHN_RP_ORIGIN", tt.rpOrigin)

			wa, err := NewWebAuthn()

			if tt.wantErr {
				if err == nil {
					t.Fatal("expected an error, got nil")
				}

				if !strings.Contains(err.Error(), tt.errMessage) {
					t.Fatalf(
						"expected error containing %q, got %q",
						tt.errMessage,
						err.Error(),
					)
				}

				return
			}

			if err != nil {
				t.Fatalf("NewWebAuthn failed: %v", err)
			}

			if wa == nil {
				t.Fatal("expected WebAuthn instance, got nil")
			}

			if wa.Config.RPID != tt.rpID {
				t.Errorf(
					"expected RP ID %q, got %q",
					tt.rpID,
					wa.Config.RPID,
				)
			}

			if len(wa.Config.RPOrigins) != 1 ||
				wa.Config.RPOrigins[0] != tt.rpOrigin {
				t.Errorf(
					"unexpected RP origins: %v",
					wa.Config.RPOrigins,
				)
			}
		})
	}
}
