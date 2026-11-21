package model

import "testing"

func TestSettlementValidate(t *testing.T) {
	tests := []struct {
		name    string
		modify  func(*Settlement)
		wantErr bool
	}{
		{
			name:    "正常な精算",
			modify:  func(s *Settlement) {},
			wantErr: false,
		},
		{
			name: "金額が0",
			modify: func(s *Settlement) {
				s.Amount = 0
			},
			wantErr: true,
		},
		{
			name: "金額がマイナス",
			modify: func(s *Settlement) {
				s.Amount = -100
			},
			wantErr: true,
		},
		{
			name: "日付が不正",
			modify: func(s *Settlement) {
				s.Date = "2026-13-40"
			},
			wantErr: true,
		},
		{
			name: "支払者が不正",
			modify: func(s *Settlement) {
				s.FromPerson = "C"
			},
			wantErr: true,
		},
		{
			name: "受取者が不正",
			modify: func(s *Settlement) {
				s.ToPerson = "C"
			},
			wantErr: true,
		},
		{
			name: "支払者と受取者が同じ",
			modify: func(s *Settlement) {
				s.ToPerson = "B"
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := Settlement{
				Date:       "2026-11-21",
				Amount:     1500,
				FromPerson: PersonB,
				ToPerson:   PersonA,
			}

			tt.modify(&s)

			err := s.Validate()

			if tt.wantErr && err == nil {
				t.Fatal("エラーが発生するはずです")
			}

			if !tt.wantErr && err != nil {
				t.Fatalf("予期しないエラー: %v", err)
			}
		})
	}
}
