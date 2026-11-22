package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/service"
)

type SettingsHandler struct {
	service *service.SettingsService
}

func NewSettingsHandler(
	settingsService *service.SettingsService,
) *SettingsHandler {
	return &SettingsHandler{
		service: settingsService,
	}
}

// Get は、共有設定を取得します。
func (h *SettingsHandler) Get(
	w http.ResponseWriter,
	r *http.Request,
) {
	settings, err := h.service.GetSettings(r.Context())
	if err != nil {
		http.Error(
			w,
			"設定情報の取得に失敗しました",
			http.StatusInternalServerError,
		)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(settings); err != nil {
		return
	}
}

// Update は、共有設定を更新します。
func (h *SettingsHandler) Update(
	w http.ResponseWriter,
	r *http.Request,
) {
	defer r.Body.Close()

	// リクエストボディを最大16KBに制限
	r.Body = http.MaxBytesReader(w, r.Body, 16*1024)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	var settings model.HouseholdSettings

	if err := decoder.Decode(&settings); err != nil {
		http.Error(
			w,
			"リクエスト形式が不正です",
			http.StatusBadRequest,
		)
		return
	}

	// 複数のJSONオブジェクトを拒否
	var extra json.RawMessage
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		http.Error(
			w,
			"リクエスト形式が不正です",
			http.StatusBadRequest,
		)
		return
	}

	if err := h.service.UpdateSettings(
		r.Context(),
		settings,
	); err != nil {
		if errors.Is(err, service.ErrInvalidSettings) {
			http.Error(
				w,
				"設定情報が不正です",
				http.StatusBadRequest,
			)
			return
		}

		http.Error(
			w,
			"設定情報の更新に失敗しました",
			http.StatusInternalServerError,
		)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
