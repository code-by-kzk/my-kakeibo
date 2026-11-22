package handler

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/service"
)

type PasskeyRegistrationHandler struct {
	service *service.PasskeyRegistrationService
}

func NewPasskeyRegistrationHandler(
	registrationService *service.PasskeyRegistrationService,
) *PasskeyRegistrationHandler {
	return &PasskeyRegistrationHandler{
		service: registrationService,
	}
}

type beginPasskeyRegistrationRequest struct {
	SetupToken string `json:"setupToken"`
}

type finishPasskeyRegistrationRequest struct {
	SetupToken  string          `json:"setupToken"`
	ChallengeID string          `json:"challengeId"`
	Credential  json.RawMessage `json:"credential"`
}

func (h *PasskeyRegistrationHandler) Begin(
	w http.ResponseWriter,
	r *http.Request,
) {
	var req beginPasskeyRegistrationRequest

	if !decodeRegistrationJSON(w, r, &req) {
		return
	}

	if req.SetupToken == "" {
		writeError(w, http.StatusBadRequest, "初期登録トークンが必要です")
		return
	}

	options, challengeID, err := h.service.BeginRegistration(
		r.Context(),
		req.SetupToken,
	)
	if err != nil {
		handlePasskeyRegistrationError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"challengeId": challengeID.String(),
		"options":     options,
	})
}

func (h *PasskeyRegistrationHandler) Finish(
	w http.ResponseWriter,
	r *http.Request,
) {
	var req finishPasskeyRegistrationRequest

	if !decodeRegistrationJSON(w, r, &req) {
		return
	}

	challengeID, err := uuid.Parse(req.ChallengeID)
	if err != nil ||
		req.SetupToken == "" ||
		len(req.Credential) == 0 {
		writeError(w, http.StatusBadRequest, "登録情報が不正です")
		return
	}

	// WebAuthnライブラリにはCredentialのJSONだけを渡します。
	credentialRequest := r.Clone(r.Context())
	credentialRequest.Body = io.NopCloser(
		strings.NewReader(string(req.Credential)),
	)
	credentialRequest.ContentLength = int64(len(req.Credential))

	err = h.service.FinishRegistration(
		r.Context(),
		req.SetupToken,
		challengeID,
		credentialRequest,
	)
	if err != nil {
		handlePasskeyRegistrationError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{
		"message": "パスキーを登録しました",
	})
}

func decodeRegistrationJSON(
	w http.ResponseWriter,
	r *http.Request,
	target any,
) bool {
	defer r.Body.Close()

	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(target); err != nil {
		writeError(w, http.StatusBadRequest, "JSON形式が不正です")
		return false
	}

	var extra json.RawMessage
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "JSON形式が不正です")
		return false
	}

	return true
}

func handlePasskeyRegistrationError(
	w http.ResponseWriter,
	err error,
) {
	switch {
	case errors.Is(err, service.ErrInvalidSetupToken),
		errors.Is(err, service.ErrExpiredSetupToken),
		errors.Is(err, service.ErrInvalidWebAuthnChallenge),
		errors.Is(err, service.ErrExpiredWebAuthnChallenge),
		errors.Is(err, service.ErrConsumedWebAuthnChallenge),
		errors.Is(err, service.ErrPasskeyRegistrationChallengeMismatch):
		writeError(w, http.StatusBadRequest, "登録情報が無効または期限切れです")

	case errors.Is(err, service.ErrPasskeyAlreadyRegistered):
		writeError(w, http.StatusConflict, "パスキーは登録済みです")

	default:
		log.Printf("passkey registration failed: %v", err)
		writeError(w, http.StatusInternalServerError, "パスキー登録に失敗しました")
	}
}
