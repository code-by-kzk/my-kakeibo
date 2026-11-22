package model

import (
	"time"

	"github.com/google/uuid"
)

// Sessionはログイン状態を管理するセッション情報です。
type Session struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	TokenHash []byte
	CreatedAt time.Time
	ExpiresAt time.Time
	RevokedAt *time.Time
}

// IsActiveはセッションが現在有効か判定します。
func (s *Session) IsActive(now time.Time) bool {
	if s == nil {
		return false
	}

	if s.RevokedAt != nil {
		return false
	}

	return now.Before(s.ExpiresAt)
}
