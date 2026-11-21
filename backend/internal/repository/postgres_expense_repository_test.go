//go:build integration

package repository

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

func setupTestRepository(t *testing.T) (
	*PostgresExpenseRepository,
	*pgxpool.Pool,
) {
	t.Helper()

	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URLが設定されていません")
	}

	// 誤って通常のDBへ接続しないための最低限の保護。
	// テスト専用のNeonブランチを使用してください。
	if databaseURL == os.Getenv("DATABASE_URL") {
		t.Fatal("テストDBと通常DBの接続文字列が同一です")
	}

	ctx, cancel := context.WithTimeout(
		context.Background(), 15*time.Second,
	)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatal(err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		t.Fatal(err)
	}

	t.Cleanup(pool.Close)

	// このテスト専用のIDを持つデータのみ操作する。
	return NewPostgresExpenseRepository(pool), pool
}

func TestPostgresExpenseRepositoryCRUD(t *testing.T) {
	repo, pool := setupTestRepository(t)
	ctx := context.Background()

	expense := model.Expense{
		ID:            uuid.NewString(),
		Date:          "2026-11-21",
		Amount:        3000,
		Payer:         model.PersonA,
		PaymentMethod: model.PaymentCredit,
		Category:      model.CategoryFood,
		Shares: model.ExpenseShares{
			A: 1500,
			B: 1500,
		},
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	// テスト途中で失敗しても、自分が作成した行だけを削除する。
	t.Cleanup(func() {
		cleanupCtx, cancel := context.WithTimeout(
			context.Background(), 10*time.Second,
		)
		defer cancel()

		_, err := pool.Exec(
			cleanupCtx,
			"DELETE FROM expenses WHERE id = $1",
			expense.ID,
		)
		if err != nil {
			t.Errorf("cleanup failed: %v", err)
		}
	})

	t.Run("Create", func(t *testing.T) {
		if err := repo.Create(ctx, expense); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("FindByID", func(t *testing.T) {
		got, err := repo.FindByID(ctx, expense.ID)
		if err != nil {
			t.Fatal(err)
		}
		if got.Amount != 3000 {
			t.Fatalf("expected 3000, got %d", got.Amount)
		}
		if got.Shares.A != 1500 || got.Shares.B != 1500 {
			t.Fatal("負担額が一致しません")
		}
	})

	t.Run("FindAll", func(t *testing.T) {
		list, err := repo.FindAll(ctx)
		if err != nil {
			t.Fatal(err)
		}

		found := false
		for _, item := range list {
			if item.ID == expense.ID {
				found = true
				break
			}
		}
		if !found {
			t.Fatal("登録した支出が一覧にありません")
		}
	})

	t.Run("Update", func(t *testing.T) {
		expense.Amount = 4000
		expense.Shares.A = 2000
		expense.Shares.B = 2000
		expense.UpdatedAt = time.Now().UTC()

		if err := repo.Update(ctx, expense); err != nil {
			t.Fatal(err)
		}

		got, err := repo.FindByID(ctx, expense.ID)
		if err != nil {
			t.Fatal(err)
		}
		if got.Amount != 4000 {
			t.Fatalf("expected 4000, got %d", got.Amount)
		}
	})

	t.Run("Delete", func(t *testing.T) {
		if err := repo.Delete(ctx, expense.ID); err != nil {
			t.Fatal(err)
		}

		_, err := repo.FindByID(ctx, expense.ID)
		if !errors.Is(err, ErrNotFound) {
			t.Fatalf("expected ErrNotFound, got %v", err)
		}
	})

	t.Run("NotFound", func(t *testing.T) {
		id := uuid.NewString()

		_, err := repo.FindByID(ctx, id)
		if !errors.Is(err, ErrNotFound) {
			t.Fatalf("FindByID: expected ErrNotFound, got %v", err)
		}

		err = repo.Delete(ctx, id)
		if !errors.Is(err, ErrNotFound) {
			t.Fatalf("Delete: expected ErrNotFound, got %v", err)
		}
	})

	t.Run("InvalidAmount", func(t *testing.T) {
		invalid := expense
		invalid.ID = uuid.NewString()
		invalid.Amount = -100

		err := repo.Create(ctx, invalid)
		if err == nil {
			t.Fatal("DBが不正な金額を受け付けました")
		}
	})
}

// 未使用importを避けるためのダミーではなく、
// 接続先文字列の検証に使用する補助関数。
func isNonEmpty(value string) bool {
	return strings.TrimSpace(value) != ""
}
