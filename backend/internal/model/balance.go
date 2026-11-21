package model

type Balance struct {
	Amount     int64  `json:"amount"`
	FromPerson Person `json:"fromPerson,omitempty"`
	ToPerson   Person `json:"toPerson,omitempty"`
}
