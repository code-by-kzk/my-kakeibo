package service

import (
	"context"
	"errors"
	"testing"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
)

type balanceExpenseRepository struct {
	expenses []model.Expense
	err      error
}

func (r *balanceExpenseRepository) FindAll(
	ctx context.Context,
) ([]model.Expense, error) {
	return r.expenses, r.err
}

func (r *balanceExpenseRepository) FindByID(
	ctx context.Context,
	id string,
) (*model.Expense, error) {
	return nil, repository.ErrNotFound
}

func (r *balanceExpenseRepository) Create(
	ctx context.Context,
	expense model.Expense,
) error {
	return nil
}

func (r *balanceExpenseRepository) Update(
	ctx context.Context,
	expense model.Expense,
) error {
	return nil
}

func (r *balanceExpenseRepository) Delete(
	ctx context.Context,
	id string,
) error {
	return nil
}

type balanceSettlementRepository struct {
	settlements []model.Settlement
	err         error
}

func (r *balanceSettlementRepository) FindAll(
	ctx context.Context,
) ([]model.Settlement, error) {
	return r.settlements, r.err
}

func (r *balanceSettlementRepository) Create(
	ctx context.Context,
	settlement model.Settlement,
) error {
	return nil
}

func (r *balanceSettlementRepository) Delete(
	ctx context.Context,
	id string,
) error {
	return nil
}

func TestBalanceServiceCalculate(t *testing.T) {
	tests := []struct {
		name        string
		expenses    []model.Expense
		settlements []model.Settlement
		want        model.Balance
	}{
		{
			name: "取引なし",
			want: model.Balance{Amount: 0},
		},
		{
			name: "Aが立て替え",
			expenses: []model.Expense{
				{
					Payer:  model.PersonA,
					Shares: model.ExpenseShares{A: 1500, B: 1500},
				},
			},
			want: model.Balance{
				Amount:     1500,
				FromPerson: model.PersonB,
				ToPerson:   model.PersonA,
			},
		},
		{
			name: "Bが立て替え",
			expenses: []model.Expense{
				{
					Payer:  model.PersonB,
					Shares: model.ExpenseShares{A: 800, B: 1200},
				},
			},
			want: model.Balance{
				Amount:     800,
				FromPerson: model.PersonA,
				ToPerson:   model.PersonB,
			},
		},
		{
			name: "支出と精算を相殺",
			expenses: []model.Expense{
				{
					Payer:  model.PersonA,
					Shares: model.ExpenseShares{A: 1500, B: 1500},
				},
				{
					Payer:  model.PersonB,
					Shares: model.ExpenseShares{A: 800, B: 1200},
				},
			},
			settlements: []model.Settlement{
				{
					Amount:     500,
					FromPerson: model.PersonB,
					ToPerson:   model.PersonA,
				},
			},
			want: model.Balance{
				Amount:     200,
				FromPerson: model.PersonB,
				ToPerson:   model.PersonA,
			},
		},
		{
			name: "全額精算済み",
			expenses: []model.Expense{
				{
					Payer:  model.PersonA,
					Shares: model.ExpenseShares{A: 1000, B: 1000},
				},
			},
			settlements: []model.Settlement{
				{
					Amount:     1000,
					FromPerson: model.PersonB,
					ToPerson:   model.PersonA,
				},
			},
			want: model.Balance{Amount: 0},
		},
		{
			name: "月をまたいだ繰り越し",
			expenses: []model.Expense{
				{
					Date:   "2026-11-21",
					Payer:  model.PersonA,
					Shares: model.ExpenseShares{A: 1000, B: 3000},
				},
				{
					Date:   "2026-12-05",
					Payer:  model.PersonA,
					Shares: model.ExpenseShares{A: 1000, B: 2000},
				},
			},
			settlements: []model.Settlement{
				{
					Date:       "2026-11-30",
					Amount:     1000,
					FromPerson: model.PersonB,
					ToPerson:   model.PersonA,
				},
			},
			want: model.Balance{
				Amount:     4000,
				FromPerson: model.PersonB,
				ToPerson:   model.PersonA,
			},
		},
		{
			name: "逆方向の精算",
			settlements: []model.Settlement{
				{
					Amount:     500,
					FromPerson: model.PersonA,
					ToPerson:   model.PersonB,
				},
			},
			want: model.Balance{
				Amount:     500,
				FromPerson: model.PersonB,
				ToPerson:   model.PersonA,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expenseRepo := &balanceExpenseRepository{
				expenses: tt.expenses,
			}
			settlementRepo := &balanceSettlementRepository{
				settlements: tt.settlements,
			}

			svc := NewBalanceService(
				expenseRepo,
				settlementRepo,
			)

			got, err := svc.Calculate(context.Background())
			if err != nil {
				t.Fatal(err)
			}

			if got != tt.want {
				t.Fatalf("want %+v, got %+v", tt.want, got)
			}
		})
	}
}

func TestBalanceServiceCalculateErrors(t *testing.T) {
	dbErr := errors.New("database error")

	t.Run("支出取得エラー", func(t *testing.T) {
		svc := NewBalanceService(
			&balanceExpenseRepository{err: dbErr},
			&balanceSettlementRepository{},
		)

		_, err := svc.Calculate(context.Background())
		if !errors.Is(err, dbErr) {
			t.Fatalf("expected database error, got %v", err)
		}
	})

	t.Run("精算取得エラー", func(t *testing.T) {
		svc := NewBalanceService(
			&balanceExpenseRepository{},
			&balanceSettlementRepository{err: dbErr},
		)

		_, err := svc.Calculate(context.Background())
		if !errors.Is(err, dbErr) {
			t.Fatalf("expected database error, got %v", err)
		}
	})
}
