package model

import (
	"errors"
	"time"
)

type Settlement struct {
	ID         string    `json:"id"`
	Date       string    `json:"date"`
	Amount     int64     `json:"amount"`
	FromPerson Person    `json:"fromPerson"`
	ToPerson   Person    `json:"toPerson"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

func (s Settlement) Validate() error {
	if s.Amount <= 0 {
		return errors.New("amount must be greater than zero")
	}

	if _, err := time.Parse("2006-01-02", s.Date); err != nil {
		return errors.New("invalid date")
	}

	if s.FromPerson != PersonA && s.FromPerson != PersonB {
		return errors.New("invalid fromPerson")
	}

	if s.ToPerson != PersonA && s.ToPerson != PersonB {
		return errors.New("invalid toPerson")
	}

	if s.FromPerson == s.ToPerson {
		return errors.New("fromPerson and toPerson must be different")
	}

	return nil
}
