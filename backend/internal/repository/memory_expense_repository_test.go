package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

func TestMemoryExpenseRepository(t *testing.T) {
	ctx := context.Background()
	repo := NewMemoryExpenseRepository()

	expense := model.Expense{
		ID:            "expense-001",
		Date:          "2026-11-21",
		Amount:        1000,
		Payer:         model.PersonA,
		PaymentMethod: model.PaymentCredit,
		Category:      model.CategoryFood,
		Shares: model.ExpenseShares{
			A: 500,
			B: 500,
		},
	}

	// 登録
	if err := repo.Create(ctx, expense); err != nil {
		t.Fatal(err)
	}

	// 重複登録
	if err := repo.Create(ctx, expense); !errors.Is(err, ErrAlreadyExists) {
		t.Fatalf("expected ErrAlreadyExists, got %v", err)
	}

	// 取得
	got, err := repo.FindByID(ctx, expense.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Amount != 1000 {
		t.Fatalf("expected 1000, got %d", got.Amount)
	}

	// 一覧
	list, err := repo.FindAll(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 expense, got %d", len(list))
	}

	// 更新
	expense.Amount = 2000
	expense.Shares.A = 1000
	expense.Shares.B = 1000

	if err := repo.Update(ctx, expense); err != nil {
		t.Fatal(err)
	}

	got, err = repo.FindByID(ctx, expense.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Amount != 2000 {
		t.Fatalf("expected 2000, got %d", got.Amount)
	}

	// 削除
	if err := repo.Delete(ctx, expense.ID); err != nil {
		t.Fatal(err)
	}

	_, err = repo.FindByID(ctx, expense.ID)
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}
