package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
	"github.com/tajimak1106/my-kakeibo/backend/internal/service"
)

type testSettlementRepository struct {
	items map[string]model.Settlement
}

func (r *testSettlementRepository) FindAll(
	ctx context.Context,
) ([]model.Settlement, error) {
	result := make([]model.Settlement, 0, len(r.items))
	for _, item := range r.items {
		result = append(result, item)
	}
	return result, nil
}

func (r *testSettlementRepository) Create(
	ctx context.Context,
	s model.Settlement,
) error {
	r.items[s.ID] = s
	return nil
}

func (r *testSettlementRepository) Delete(
	ctx context.Context,
	id string,
) error {
	if _, ok := r.items[id]; !ok {
		return repository.ErrNotFound
	}
	delete(r.items, id)
	return nil
}

func setupSettlementHandler() http.Handler {
	repo := &testSettlementRepository{
		items: make(map[string]model.Settlement),
	}
	svc := service.NewSettlementService(repo)
	h := NewSettlementHandler(svc)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/settlements", h.GetAll)
	mux.HandleFunc("POST /api/settlements", h.Create)
	mux.HandleFunc("DELETE /api/settlements/{id}", h.Delete)
	return mux
}

func TestSettlementHandlerCRUD(t *testing.T) {
	server := setupSettlementHandler()

	body := []byte(`{
		"date":"2026-11-21",
		"amount":1500,
		"fromPerson":"B",
		"toPerson":"A"
	}`)

	// POST
	req := httptest.NewRequest(
		http.MethodPost,
		"/api/settlements",
		bytes.NewReader(body),
	)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("POST: expected 201, got %d: %s",
			rec.Code, rec.Body.String())
	}

	var created model.Settlement
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}

	if created.ID == "" {
		t.Fatal("IDが生成されていません")
	}

	// GET
	req = httptest.NewRequest(
		http.MethodGet,
		"/api/settlements",
		nil,
	)
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET: expected 200, got %d", rec.Code)
	}

	var list []model.Settlement
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatal(err)
	}

	if len(list) != 1 {
		t.Fatalf("expected 1 settlement, got %d", len(list))
	}

	// DELETE
	req = httptest.NewRequest(
		http.MethodDelete,
		"/api/settlements/"+created.ID,
		nil,
	)
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("DELETE: expected 204, got %d", rec.Code)
	}

	// 削除後のGET
	req = httptest.NewRequest(
		http.MethodGet,
		"/api/settlements",
		nil,
	)
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatal(err)
	}

	if len(list) != 0 {
		t.Fatalf("削除後の件数: %d", len(list))
	}
}

func TestSettlementHandlerInvalidRequest(t *testing.T) {
	server := setupSettlementHandler()

	tests := []struct {
		name string
		body string
	}{
		{"不正なJSON", `{invalid}`},
		{"金額が0", `{"date":"2026-11-21","amount":0,"fromPerson":"B","toPerson":"A"}`},
		{"同一人物間の精算", `{"date":"2026-11-21","amount":1000,"fromPerson":"A","toPerson":"A"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(
				http.MethodPost,
				"/api/settlements",
				bytes.NewBufferString(tt.body),
			)
			rec := httptest.NewRecorder()
			server.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d", rec.Code)
			}
		})
	}
}
