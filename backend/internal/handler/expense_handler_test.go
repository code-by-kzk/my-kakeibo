package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
	"github.com/tajimak1106/my-kakeibo/backend/internal/service"
)

func setupExpenseRouter() *http.ServeMux {
	repo := repository.NewMemoryExpenseRepository()
	svc := service.NewExpenseService(repo)
	h := NewExpenseHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/expenses", h.FindAll)
	mux.HandleFunc("GET /api/expenses/{id}", h.FindByID)
	mux.HandleFunc("POST /api/expenses", h.Create)
	mux.HandleFunc("PUT /api/expenses/{id}", h.Update)
	mux.HandleFunc("DELETE /api/expenses/{id}", h.Delete)

	return mux
}

func TestExpenseHandler(t *testing.T) {
	router := setupExpenseRouter()

	// 初期状態の一覧取得
	req := httptest.NewRequest(http.MethodGet, "/api/expenses", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET status = %d", rec.Code)
	}

	// 支出登録
	input := model.Expense{
		Date:          "2026-11-21",
		Amount:        2000,
		Payer:         model.PersonA,
		PaymentMethod: model.PaymentCredit,
		Category:      model.CategoryFood,
		Shares: model.ExpenseShares{
			A: 1000,
			B: 1000,
		},
	}

	body, err := json.Marshal(input)
	if err != nil {
		t.Fatal(err)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/expenses", bytes.NewReader(body))
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("POST status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var created model.Expense
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}

	if created.ID == "" {
		t.Fatal("支出IDが生成されていません")
	}

	// 登録した支出を取得
	req = httptest.NewRequest(http.MethodGet, "/api/expenses/"+created.ID, nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET detail status = %d", rec.Code)
	}

	// 不正な支出登録
	input.Amount = -100
	body, _ = json.Marshal(input)

	req = httptest.NewRequest(http.MethodPost, "/api/expenses", bytes.NewReader(body))
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid POST status = %d", rec.Code)
	}

	// 存在しない支出
	req = httptest.NewRequest(http.MethodGet, "/api/expenses/not-found", nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("not found status = %d", rec.Code)
	}

	// 支出削除
	req = httptest.NewRequest(http.MethodDelete, "/api/expenses/"+created.ID, nil)
	rec = httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("DELETE status = %d", rec.Code)
	}
}
