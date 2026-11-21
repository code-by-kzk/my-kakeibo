package repository

import (
	"context"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

type SettlementRepository interface {
	FindAll(ctx context.Context) ([]model.Settlement, error)
	Create(ctx context.Context, settlement model.Settlement) error
	Delete(ctx context.Context, id string) error
}
