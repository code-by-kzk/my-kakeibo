package model

import (
	"errors"
	"time"
)

func (e Expense) Validate() error {
	if e.Amount <= 0 {
		return errors.New("金額は1円以上にしてください")
	}

	if e.Payer != PersonA && e.Payer != PersonB {
		return errors.New("支払者が不正です")
	}

	if e.Shares.A < 0 || e.Shares.B < 0 {
		return errors.New("負担額は0円以上にしてください")
	}

	if e.Shares.A > e.Amount ||
		e.Shares.B != e.Amount-e.Shares.A {
		return errors.New("負担額の合計が支出金額と一致しません")
	}

	if _, err := time.Parse("2006-01-02", e.Date); err != nil {
		return errors.New("日付の形式が不正です")
	}

	switch e.PaymentMethod {
	case PaymentCash, PaymentCredit, PaymentDebit, PaymentQR:
	default:
		return errors.New("支払い方法が不正です")
	}

	switch e.Category {
	case CategoryFood, CategoryDaily, CategoryTransport,
		CategoryHousing, CategoryUtilities,
		CategoryEntertainment, CategoryOther:
	default:
		return errors.New("カテゴリが不正です")
	}

	return nil
}
