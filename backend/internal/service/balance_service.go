package service

import (
	"context"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
)

type BalanceService struct {
	expenseRepo    repository.ExpenseRepository
	settlementRepo repository.SettlementRepository
}

func NewBalanceService(
	expenseRepo repository.ExpenseRepository,
	settlementRepo repository.SettlementRepository,
) *BalanceService {
	return &BalanceService{
		expenseRepo:    expenseRepo,
		settlementRepo: settlementRepo,
	}
}

func (s *BalanceService) Calculate(
	ctx context.Context,
) (model.Balance, error) {
	expenses, err := s.expenseRepo.FindAll(ctx)
	if err != nil {
		return model.Balance{}, err
	}

	settlements, err := s.settlementRepo.FindAll(ctx)
	if err != nil {
		return model.Balance{}, err
	}

	var net int64

	// 支出による立て替えを計算
	for _, expense := range expenses {
		switch expense.Payer {
		case model.PersonA:
			net += expense.Shares.B
		case model.PersonB:
			net -= expense.Shares.A
		}
	}

	// 精算履歴を反映
	for _, settlement := range settlements {
		switch settlement.FromPerson {
		case model.PersonB:
			net -= settlement.Amount
		case model.PersonA:
			net += settlement.Amount
		}
	}

	switch {
	case net > 0:
		return model.Balance{
			Amount:     net,
			FromPerson: model.PersonB,
			ToPerson:   model.PersonA,
		}, nil

	case net < 0:
		return model.Balance{
			Amount:     -net,
			FromPerson: model.PersonA,
			ToPerson:   model.PersonB,
		}, nil

	default:
		return model.Balance{Amount: 0}, nil
	}
}
