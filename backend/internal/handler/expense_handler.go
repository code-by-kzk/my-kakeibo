package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
	"github.com/tajimak1106/my-kakeibo/backend/internal/service"
)

type ExpenseHandler struct {
	service *service.ExpenseService
}

func NewExpenseHandler(
	service *service.ExpenseService,
) *ExpenseHandler {
	return &ExpenseHandler{service: service}
}

func writeJSON(
	w http.ResponseWriter,
	status int,
	data any,
) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(
	w http.ResponseWriter,
	status int,
	message string,
) {
	writeJSON(w, status, map[string]string{
		"error": message,
	})
}

func handleExpenseError(w http.ResponseWriter, err error) {
	if errors.Is(err, repository.ErrNotFound) {
		writeError(w, http.StatusNotFound, "支出が見つかりません")
		return
	}

	writeError(w, http.StatusInternalServerError, "サーバーエラー")
}

func (h *ExpenseHandler) FindAll(
	w http.ResponseWriter,
	r *http.Request,
) {
	expenses, err := h.service.FindAll(r.Context())
	if err != nil {
		handleExpenseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, expenses)
}

func (h *ExpenseHandler) FindByID(
	w http.ResponseWriter,
	r *http.Request,
) {
	id := r.PathValue("id")

	expense, err := h.service.FindByID(r.Context(), id)
	if err != nil {
		handleExpenseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, expense)
}

func (h *ExpenseHandler) Create(
	w http.ResponseWriter,
	r *http.Request,
) {
	defer r.Body.Close()

	var expense model.Expense

	if err := json.NewDecoder(r.Body).Decode(&expense); err != nil {
		writeError(w, http.StatusBadRequest, "JSON形式が不正です")
		return
	}

	if err := expense.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	created, err := h.service.Create(r.Context(), expense)
	if err != nil {
		handleExpenseError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, created)
}

func (h *ExpenseHandler) Update(
	w http.ResponseWriter,
	r *http.Request,
) {
	defer r.Body.Close()

	id := r.PathValue("id")

	var expense model.Expense

	if err := json.NewDecoder(r.Body).Decode(&expense); err != nil {
		writeError(w, http.StatusBadRequest, "JSON形式が不正です")
		return
	}

	if err := expense.Validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	updated, err := h.service.Update(
		r.Context(),
		id,
		expense,
	)
	if err != nil {
		handleExpenseError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, updated)
}

func (h *ExpenseHandler) Delete(
	w http.ResponseWriter,
	r *http.Request,
) {
	id := r.PathValue("id")

	if err := h.service.Delete(r.Context(), id); err != nil {
		handleExpenseError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
