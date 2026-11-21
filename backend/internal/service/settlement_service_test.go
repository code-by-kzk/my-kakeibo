package service

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
)

type fakeSettlementRepository struct {
	data map[string]model.Settlement
}

func newFakeSettlementRepository() *fakeSettlementRepository {
	return &fakeSettlementRepository{
		data: make(map[string]model.Settlement),
	}
}

func (r *fakeSettlementRepository) FindAll(
	ctx context.Context,
) ([]model.Settlement, error) {
	result := make([]model.Settlement, 0, len(r.data))

	for _, settlement := range r.data {
		result = append(result, settlement)
	}

	return result, nil
}

func (r *fakeSettlementRepository) Create(
	ctx context.Context,
	s model.Settlement,
) error {
	r.data[s.ID] = s
	return nil
}

func (r *fakeSettlementRepository) Delete(
	ctx context.Context,
	id string,
) error {
	if _, exists := r.data[id]; !exists {
		return repository.ErrNotFound
	}

	delete(r.data, id)
	return nil
}

func TestSettlementServiceCreate(t *testing.T) {
	repo := newFakeSettlementRepository()
	svc := NewSettlementService(repo)

	input := model.Settlement{
		Date:       "2026-11-21",
		Amount:     1500,
		FromPerson: model.PersonB,
		ToPerson:   model.PersonA,
	}

	created, err := svc.Create(context.Background(), input)
	if err != nil {
		t.Fatal(err)
	}

	if _, err := uuid.Parse(created.ID); err != nil {
		t.Fatalf("IDがUUIDではありません: %v", err)
	}

	if created.CreatedAt.IsZero() {
		t.Fatal("CreatedAtが設定されていません")
	}

	if created.UpdatedAt.IsZero() {
		t.Fatal("UpdatedAtが設定されていません")
	}

	if len(repo.data) != 1 {
		t.Fatalf("登録件数が不正です: %d", len(repo.data))
	}
}

func TestSettlementServiceCreateInvalid(t *testing.T) {
	repo := newFakeSettlementRepository()
	svc := NewSettlementService(repo)

	_, err := svc.Create(context.Background(), model.Settlement{
		Date:       "2026-11-21",
		Amount:     -100,
		FromPerson: model.PersonB,
		ToPerson:   model.PersonA,
	})

	if err == nil {
		t.Fatal("不正な金額が登録されました")
	}

	if len(repo.data) != 0 {
		t.Fatal("不正なデータがRepositoryに渡されました")
	}
}

func TestSettlementServiceFindAll(t *testing.T) {
	repo := newFakeSettlementRepository()
	svc := NewSettlementService(repo)

	_, err := svc.Create(context.Background(), model.Settlement{
		Date:       "2026-11-21",
		Amount:     1500,
		FromPerson: model.PersonB,
		ToPerson:   model.PersonA,
	})
	if err != nil {
		t.Fatal(err)
	}

	list, err := svc.FindAll(context.Background())
	if err != nil {
		t.Fatal(err)
	}

	if len(list) != 1 {
		t.Fatalf("期待件数1、実際%d", len(list))
	}
}

func TestSettlementServiceDelete(t *testing.T) {
	repo := newFakeSettlementRepository()
	svc := NewSettlementService(repo)

	created, err := svc.Create(context.Background(), model.Settlement{
		Date:       "2026-11-21",
		Amount:     1500,
		FromPerson: model.PersonB,
		ToPerson:   model.PersonA,
	})
	if err != nil {
		t.Fatal(err)
	}

	if err := svc.Delete(context.Background(), created.ID); err != nil {
		t.Fatal(err)
	}

	if len(repo.data) != 0 {
		t.Fatal("削除後もデータが残っています")
	}

	err = svc.Delete(context.Background(), created.ID)
	if !errors.Is(err, repository.ErrNotFound) {
		t.Fatalf("ErrNotFoundを期待しました: %v", err)
	}
}

func TestSettlementServiceDeleteInvalidID(t *testing.T) {
	repo := newFakeSettlementRepository()
	svc := NewSettlementService(repo)

	err := svc.Delete(context.Background(), "invalid-id")

	if !errors.Is(err, repository.ErrNotFound) {
		t.Fatalf("ErrNotFoundを期待しました: %v", err)
	}
}
