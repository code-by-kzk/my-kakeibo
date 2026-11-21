//go:build integration

package repository

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

func TestPostgresSettlementRepositoryCRUD(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Fatal("TEST_DATABASE_URLが設定されていません")
	}
	if databaseURL == os.Getenv("DATABASE_URL") {
		t.Fatal("通常DBとテストDBの接続文字列が同一です")
	}

	ctx, cancel := context.WithTimeout(
		context.Background(), 30*time.Second,
	)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	// defer pool.Close() を削除して、
	// 接続直後に次を追加する
	t.Cleanup(pool.Close)

	if err := pool.Ping(ctx); err != nil {
		t.Fatal(err)
	}

	repo := NewPostgresSettlementRepository(pool)

	s := model.Settlement{
		ID:         uuid.NewString(),
		Date:       "2026-11-21",
		Amount:     1500,
		FromPerson: model.PersonB,
		ToPerson:   model.PersonA,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}

	// テストで作成した行だけを後片付けする。
	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(
			context.Background(), 10*time.Second,
		)
		defer cleanupCancel()

		_, err := pool.Exec(
			cleanupCtx,
			"DELETE FROM settlements WHERE id = $1",
			s.ID,
		)
		if err != nil {
			t.Errorf("cleanup failed: %v", err)
		}
	})

	t.Run("Create", func(t *testing.T) {
		if err := repo.Create(ctx, s); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("FindAll", func(t *testing.T) {
		list, err := repo.FindAll(ctx)
		if err != nil {
			t.Fatal(err)
		}

		found := false
		for _, item := range list {
			if item.ID == s.ID {
				found = true
				if item.Amount != 1500 {
					t.Fatalf("expected 1500, got %d", item.Amount)
				}
				break
			}
		}

		if !found {
			t.Fatal("登録した精算が取得できません")
		}
	})

	t.Run("Delete", func(t *testing.T) {
		if err := repo.Delete(ctx, s.ID); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("NotFound", func(t *testing.T) {
		err := repo.Delete(ctx, uuid.NewString())
		if !errors.Is(err, ErrNotFound) {
			t.Fatalf("expected ErrNotFound, got %v", err)
		}
	})

	t.Run("InvalidAmount", func(t *testing.T) {
		invalid := s
		invalid.ID = uuid.NewString()
		invalid.Amount = -100

		if err := repo.Create(ctx, invalid); err == nil {
			t.Fatal("不正な金額が登録されました")
		}
	})

	t.Run("SamePerson", func(t *testing.T) {
		invalid := s
		invalid.ID = uuid.NewString()
		invalid.FromPerson = model.PersonA
		invalid.ToPerson = model.PersonA

		if err := repo.Create(ctx, invalid); err == nil {
			t.Fatal("同一人物間の精算が登録されました")
		}
	})
}
