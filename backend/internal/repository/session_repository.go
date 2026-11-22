package repository

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

// SessionRepositoryはログインセッションの
// データアクセスを定義します。
type SessionRepository interface {

	// CreateSessionは新しいセッションを保存します。
	CreateSession(
		ctx context.Context,
		session *model.Session,
	) error

	// FindSessionByTokenHashはトークンのハッシュから
	// セッションを取得します。
	FindSessionByTokenHash(
		ctx context.Context,
		tokenHash []byte,
	) (*model.Session, error)

	// RevokeSessionは指定されたセッションを失効させます。
	RevokeSession(
		ctx context.Context,
		sessionID uuid.UUID,
	) error

	// RevokeAllSessionsByUserIDはユーザーの
	// 全セッションを失効させます。
	RevokeAllSessionsByUserID(
		ctx context.Context,
		userID uuid.UUID,
	) error

	// DeleteExpiredSessionsは期限切れセッションを削除します。
	DeleteExpiredSessions(
		ctx context.Context,
		now time.Time,
	) (int64, error)
}
