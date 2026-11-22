package model

// HouseholdSettings は、ふたりで共有する家計簿の設定情報です。
type HouseholdSettings struct {
	HouseholdName        string      `json:"householdName"`
	MemberNames          MemberNames `json:"memberNames"`
	DefaultSharePercentA float64     `json:"defaultSharePercentA"`
}

// MemberNames は、Aさん・Bさんの表示名です。
type MemberNames struct {
	A string `json:"A"`
	B string `json:"B"`
}

// DefaultHouseholdSettings は、設定の初期値を返します。
func DefaultHouseholdSettings() HouseholdSettings {
	return HouseholdSettings{
		HouseholdName: "ふたりの家計簿",
		MemberNames: MemberNames{
			A: "Aさん",
			B: "Bさん",
		},
		DefaultSharePercentA: 50,
	}
}
