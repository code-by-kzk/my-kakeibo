package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

type stubBalanceCalculator struct {
	balance model.Balance
	err     error
}

func (s *stubBalanceCalculator) Calculate(
	ctx context.Context,
) (model.Balance, error) {
	return s.balance, s.err
}

func TestBalanceHandlerGetBalance(t *testing.T) {
	tests := []struct {
		name       string
		balance    model.Balance
		err        error
		wantStatus int
	}{
		{
			name: "未精算残高あり",
			balance: model.Balance{
				Amount:     1500,
				FromPerson: model.PersonB,
				ToPerson:   model.PersonA,
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "精算済み",
			balance: model.Balance{
				Amount: 0,
			},
			wantStatus: http.StatusOK,
		},
		{
			name:       "DBエラー",
			err:        errors.New("database error"),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calculator := &stubBalanceCalculator{
				balance: tt.balance,
				err:     tt.err,
			}

			h := NewBalanceHandler(calculator)

			req := httptest.NewRequest(
				http.MethodGet,
				"/api/balance",
				nil,
			)
			rec := httptest.NewRecorder()

			h.GetBalance(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf(
					"want status %d, got %d",
					tt.wantStatus,
					rec.Code,
				)
			}

			if tt.err != nil {
				return
			}

			var got model.Balance
			if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
				t.Fatal(err)
			}

			if got != tt.balance {
				t.Fatalf(
					"want %+v, got %+v",
					tt.balance,
					got,
				)
			}
		})
	}
}
