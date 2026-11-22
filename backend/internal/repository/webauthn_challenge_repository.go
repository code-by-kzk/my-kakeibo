package repository

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

// WebAuthnChallengeRepositoryはWebAuthnチャレンジの
// データアクセスを定義します。
type WebAuthnChallengeRepository interface {
	// Createは新しいチャレンジを保存します。
	Create(
		ctx context.Context,
		challenge *model.WebAuthnChallenge,
	) error

	// FindByIDはチャレンジIDから情報を取得します。
	FindByID(
		ctx context.Context,
		challengeID uuid.UUID,
	) (*model.WebAuthnChallenge, error)

	// Consumeは未使用かつ有効期限内のチャレンジを
	// 使用済みにします。
	//
	// 指定されたチャレンジ種別と一致する場合のみ更新します。
	// 消費に成功した場合はtrueを返します。
	Consume(
		ctx context.Context,
		challengeID uuid.UUID,
		expectedType string,
		now time.Time,
	) (bool, error)

	// DeleteExpiredは期限切れのチャレンジを削除します。
	DeleteExpired(
		ctx context.Context,
		now time.Time,
	) (int64, error)
}
