package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

type BalanceCalculator interface {
	Calculate(ctx context.Context) (model.Balance, error)
}

type BalanceHandler struct {
	service BalanceCalculator
}

func NewBalanceHandler(
	balanceService BalanceCalculator,
) *BalanceHandler {
	return &BalanceHandler{
		service: balanceService,
	}
}

func (h *BalanceHandler) GetBalance(
	w http.ResponseWriter,
	r *http.Request,
) {
	balance, err := h.service.Calculate(r.Context())
	if err != nil {
		log.Printf("failed to calculate balance: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(balance); err != nil {
		log.Printf("failed to encode balance: %v", err)
	}
}
