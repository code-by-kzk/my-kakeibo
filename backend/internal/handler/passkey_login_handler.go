package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/service"
)

type PasskeyLoginHandler struct {
	loginService   *service.PasskeyLoginService
	sessionService *service.SessionService
}

func NewPasskeyLoginHandler(
	loginService *service.PasskeyLoginService,
	sessionService *service.SessionService,
) *PasskeyLoginHandler {
	return &PasskeyLoginHandler{
		loginService:   loginService,
		sessionService: sessionService,
	}
}

func sessionCookie(token string, maxAge int) *http.Cookie {
	return &http.Cookie{
		Name:     SessionCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   os.Getenv("APP_ENV") == "production",
		SameSite: http.SameSiteStrictMode,
	}
}

func (h *PasskeyLoginHandler) Begin(
	w http.ResponseWriter,
	r *http.Request,
) {
	var req struct {
		MemberCode string `json:"memberCode"`
	}

	if err := decodeLoginJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "リクエストが不正です")
		return
	}

	options, challengeID, err := h.loginService.BeginLogin(
		r.Context(),
		req.MemberCode,
	)
	if err != nil {
		if errors.Is(err, service.ErrPasskeyLoginInvalid) ||
			errors.Is(err, service.ErrPasskeyLoginUserNotFound) ||
			errors.Is(err, service.ErrPasskeyLoginNotRegistered) {
			writeError(w, http.StatusBadRequest, "ログインを開始できません")
			return
		}

		writeError(w, http.StatusInternalServerError, "サーバーエラー")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"challengeId": challengeID,
		"options":     options,
	})
}

func (h *PasskeyLoginHandler) Finish(
	w http.ResponseWriter,
	r *http.Request,
) {
	var req struct {
		ChallengeID uuid.UUID       `json:"challengeId"`
		Credential  json.RawMessage `json:"credential"`
	}

	if err := decodeLoginJSON(r, &req); err != nil ||
		req.ChallengeID == uuid.Nil ||
		len(req.Credential) == 0 {
		writeError(w, http.StatusBadRequest, "リクエストが不正です")
		return
	}

	credentialRequest := r.Clone(r.Context())
	credentialRequest.Body = io.NopCloser(
		strings.NewReader(string(req.Credential)),
	)
	credentialRequest.ContentLength = int64(len(req.Credential))

	token, err := h.loginService.FinishLogin(
		r.Context(),
		req.ChallengeID,
		credentialRequest,
	)
	if err != nil {
		if errors.Is(err, service.ErrPasskeyLoginInvalid) ||
			errors.Is(err, service.ErrPasskeyLoginUserNotFound) ||
			errors.Is(err, service.ErrPasskeyLoginNotRegistered) {
			writeError(w, http.StatusUnauthorized, "パスキー認証に失敗しました")
			return
		}

		writeError(w, http.StatusInternalServerError, "サーバーエラー")
		return
	}

	http.SetCookie(
		w,
		sessionCookie(token, int((7*24*time.Hour).Seconds())),
	)

	writeJSON(w, http.StatusOK, map[string]any{
		"authenticated": true,
	})
}

func (h *PasskeyLoginHandler) Logout(
	w http.ResponseWriter,
	r *http.Request,
) {
	cookie, err := r.Cookie(SessionCookieName)
	if err == nil && cookie.Value != "" {
		if err := h.sessionService.RevokeSession(
			r.Context(),
			cookie.Value,
		); err != nil &&
			!errors.Is(err, service.ErrInvalidSession) &&
			!errors.Is(err, service.ErrExpiredSession) {
			writeError(w, http.StatusInternalServerError, "ログアウトに失敗しました")
			return
		}
	}

	http.SetCookie(w, sessionCookie("", -1))

	writeJSON(w, http.StatusOK, map[string]any{
		"authenticated": false,
	})
}

func decodeLoginJSON(r *http.Request, target any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, 64*1024)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(target); err != nil {
		return err
	}

	if err := decoder.Decode(new(any)); err != io.EOF {
		return errors.New("unexpected trailing JSON")
	}

	return nil
}
