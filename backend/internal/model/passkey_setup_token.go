package model

import (
	"time"

	"github.com/google/uuid"
)

// PasskeySetupTokenはパスキー初期登録用の
// ワンタイムトークンを管理します。
type PasskeySetupToken struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	TokenHash []byte
	CreatedAt time.Time
	ExpiresAt time.Time
	UsedAt    *time.Time
}

// IsValidはトークンが現在使用可能か判定します。
func (t *PasskeySetupToken) IsValid(now time.Time) bool {
	if t == nil {
		return false
	}

	// 使用済みのトークンは無効
	if t.UsedAt != nil {
		return false
	}

	// 有効期限切れのトークンは無効
	if !now.Before(t.ExpiresAt) {
		return false
	}

	// 不正なデータを拒否
	if t.UserID == uuid.Nil {
		return false
	}

	if len(t.TokenHash) != 32 {
		return false
	}

	return true
}
