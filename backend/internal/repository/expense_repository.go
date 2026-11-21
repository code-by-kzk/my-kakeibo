package repository

import (
	"context"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

type ExpenseRepository interface {
	FindAll(ctx context.Context) ([]model.Expense, error)
	FindByID(ctx context.Context, id string) (*model.Expense, error)
	Create(ctx context.Context, expense model.Expense) error
	Update(ctx context.Context, expense model.Expense) error
	Delete(ctx context.Context, id string) error
}
