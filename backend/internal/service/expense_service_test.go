package service

import (
	"context"
	"errors"
	"testing"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
)

func validExpense() model.Expense {
	return model.Expense{
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
}

func TestExpenseService(t *testing.T) {
	ctx := context.Background()
	repo := repository.NewMemoryExpenseRepository()
	svc := NewExpenseService(repo)

	// 登録
	created, err := svc.Create(ctx, validExpense())
	if err != nil {
		t.Fatal(err)
	}

	if created.ID == "" {
		t.Fatal("IDが生成されていません")
	}
	if created.CreatedAt.IsZero() || created.UpdatedAt.IsZero() {
		t.Fatal("日時が設定されていません")
	}

	// 取得
	found, err := svc.FindByID(ctx, created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if found.Amount != 1000 {
		t.Fatalf("expected 1000, got %d", found.Amount)
	}

	// 一覧
	list, err := svc.FindAll(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1, got %d", len(list))
	}

	// 更新
	updatedInput := validExpense()
	updatedInput.Amount = 2000
	updatedInput.Shares.A = 1000
	updatedInput.Shares.B = 1000

	updated, err := svc.Update(ctx, created.ID, updatedInput)
	if err != nil {
		t.Fatal(err)
	}

	if updated.Amount != 2000 {
		t.Fatalf("expected 2000, got %d", updated.Amount)
	}
	if !updated.CreatedAt.Equal(created.CreatedAt) {
		t.Fatal("CreatedAtが変更されました")
	}

	// 削除
	if err := svc.Delete(ctx, created.ID); err != nil {
		t.Fatal(err)
	}

	_, err = svc.FindByID(ctx, created.ID)
	if !errors.Is(err, repository.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestExpenseServiceInvalidExpense(t *testing.T) {
	ctx := context.Background()
	repo := repository.NewMemoryExpenseRepository()
	svc := NewExpenseService(repo)

	expense := validExpense()
	expense.Amount = -100

	_, err := svc.Create(ctx, expense)
	if err == nil {
		t.Fatal("不正な金額が登録されました")
	}
}
