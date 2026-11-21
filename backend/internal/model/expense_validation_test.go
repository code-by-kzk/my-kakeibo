package model

import "testing"

func TestExpenseValidate(t *testing.T) {
	tests := []struct {
		name    string
		expense Expense
		wantErr bool
	}{
		{
			name: "正常な支出",
			expense: Expense{
				Date:          "2026-11-21",
				Amount:        1000,
				Payer:         PersonA,
				PaymentMethod: PaymentCredit,
				Category:      CategoryFood,
				Shares: ExpenseShares{
					A: 500,
					B: 500,
				},
			},
			wantErr: false,
		},
		{
			name: "負担額が一致しない",
			expense: Expense{
				Date:          "2026-11-21",
				Amount:        1000,
				Payer:         PersonA,
				PaymentMethod: PaymentCredit,
				Category:      CategoryFood,
				Shares: ExpenseShares{
					A: 400,
					B: 500,
				},
			},
			wantErr: true,
		},
		{
			name: "金額がゼロ",
			expense: Expense{
				Date:          "2026-11-21",
				Amount:        0,
				Payer:         PersonA,
				PaymentMethod: PaymentCash,
				Category:      CategoryFood,
				Shares: ExpenseShares{
					A: 0,
					B: 0,
				},
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.expense.Validate()

			if (err != nil) != tt.wantErr {
				t.Errorf(
					"Validate() error = %v, wantErr = %v",
					err,
					tt.wantErr,
				)
			}
		})
	}
}
