package repository

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

// PasskeySetupTokenRepositoryは、パスキー初期登録用
// トークンのデータアクセスを定義します。
type PasskeySetupTokenRepository interface {
	// Createは初期登録トークンを保存します。
	Create(
		ctx context.Context,
		token *model.PasskeySetupToken,
	) error

	// FindByTokenHashはトークンのハッシュから
	// 初期登録トークンを取得します。
	FindByTokenHash(
		ctx context.Context,
		tokenHash []byte,
	) (*model.PasskeySetupToken, error)

	// Consumeは未使用かつ有効期限内のトークンを
	// 使用済みにします。
	// 使用済みにできた場合のみtrueを返します。
	Consume(
		ctx context.Context,
		tokenID uuid.UUID,
		now time.Time,
	) (bool, error)

	// DeleteExpiredは期限切れのトークンを削除します。
	DeleteExpired(
		ctx context.Context,
		now time.Time,
	) (int64, error)
}
