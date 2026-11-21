package service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
)

type SettlementService struct {
	repo repository.SettlementRepository
}

func NewSettlementService(
	repo repository.SettlementRepository,
) *SettlementService {
	return &SettlementService{repo: repo}
}

func (s *SettlementService) FindAll(
	ctx context.Context,
) ([]model.Settlement, error) {
	return s.repo.FindAll(ctx)
}

func (s *SettlementService) Create(
	ctx context.Context,
	settlement model.Settlement,
) (model.Settlement, error) {
	if err := settlement.Validate(); err != nil {
		return model.Settlement{}, err
	}

	now := time.Now().UTC()

	settlement.ID = uuid.NewString()
	settlement.CreatedAt = now
	settlement.UpdatedAt = now

	if err := s.repo.Create(ctx, settlement); err != nil {
		return model.Settlement{}, err
	}

	return settlement, nil
}

func (s *SettlementService) Delete(
	ctx context.Context,
	id string,
) error {
	if _, err := uuid.Parse(id); err != nil {
		return repository.ErrNotFound
	}

	return s.repo.Delete(ctx, id)
}
