package service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
)

type ExpenseService struct {
	repo repository.ExpenseRepository
}

func NewExpenseService(
	repo repository.ExpenseRepository,
) *ExpenseService {
	return &ExpenseService{
		repo: repo,
	}
}

func (s *ExpenseService) FindAll(
	ctx context.Context,
) ([]model.Expense, error) {
	return s.repo.FindAll(ctx)
}

func (s *ExpenseService) FindByID(
	ctx context.Context,
	id string,
) (*model.Expense, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *ExpenseService) Create(
	ctx context.Context,
	expense model.Expense,
) (*model.Expense, error) {
	if err := expense.Validate(); err != nil {
		return nil, err
	}

	now := time.Now().UTC()

	expense.ID = uuid.NewString()
	expense.CreatedAt = now
	expense.UpdatedAt = now

	if err := s.repo.Create(ctx, expense); err != nil {
		return nil, err
	}

	return &expense, nil
}

func (s *ExpenseService) Update(
	ctx context.Context,
	id string,
	expense model.Expense,
) (*model.Expense, error) {
	if err := expense.Validate(); err != nil {
		return nil, err
	}

	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	expense.ID = id
	expense.CreatedAt = existing.CreatedAt
	expense.UpdatedAt = time.Now().UTC()

	if err := s.repo.Update(ctx, expense); err != nil {
		return nil, err
	}

	return &expense, nil
}

func (s *ExpenseService) Delete(
	ctx context.Context,
	id string,
) error {
	return s.repo.Delete(ctx, id)
}
