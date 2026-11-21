package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
	"github.com/tajimak1106/my-kakeibo/backend/internal/service"
)

type SettlementHandler struct {
	service *service.SettlementService
}

func NewSettlementHandler(
	service *service.SettlementService,
) *SettlementHandler {
	return &SettlementHandler{service: service}
}

func (h *SettlementHandler) GetAll(
	w http.ResponseWriter,
	r *http.Request,
) {
	settlements, err := h.service.FindAll(r.Context())
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settlements)
}

func (h *SettlementHandler) Create(
	w http.ResponseWriter,
	r *http.Request,
) {
	var settlement model.Settlement

	if err := json.NewDecoder(r.Body).Decode(&settlement); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	if err := settlement.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	created, err := h.service.Create(r.Context(), settlement)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(created)
}

func (h *SettlementHandler) Delete(
	w http.ResponseWriter,
	r *http.Request,
) {
	id := r.PathValue("id")

	err := h.service.Delete(r.Context(), id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			http.Error(w, "settlement not found", http.StatusNotFound)
			return
		}

		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
