package model

import "time"

type Person string

const (
	PersonA Person = "A"
	PersonB Person = "B"
)

type PaymentMethod string

const (
	PaymentCash   PaymentMethod = "cash"
	PaymentCredit PaymentMethod = "credit"
	PaymentDebit  PaymentMethod = "debit"
	PaymentQR     PaymentMethod = "qr"
)

type Category string

const (
	CategoryFood          Category = "food"
	CategoryDaily         Category = "daily"
	CategoryTransport     Category = "transport"
	CategoryHousing       Category = "housing"
	CategoryUtilities     Category = "utilities"
	CategoryEntertainment Category = "entertainment"
	CategoryOther         Category = "other"
)

type ExpenseShares struct {
	A int64 `json:"A"`
	B int64 `json:"B"`
}

type Expense struct {
	ID            string        `json:"id"`
	Date          string        `json:"date"`
	Amount        int64         `json:"amount"`
	Payer         Person        `json:"payer"`
	PaymentMethod PaymentMethod `json:"paymentMethod"`
	Category      Category      `json:"category"`
	Shares        ExpenseShares `json:"shares"`
	CreatedAt     time.Time     `json:"createdAt"`
	UpdatedAt     time.Time     `json:"updatedAt"`
}
