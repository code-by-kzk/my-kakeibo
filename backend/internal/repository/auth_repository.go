package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

// AuthRepositoryは認証に必要なデータアクセスを定義します。
type AuthRepository interface {
	// ユーザーをIDから取得
	FindUserByID(
		ctx context.Context,
		userID uuid.UUID,
	) (*model.User, error)

	// ユーザーをメンバーコードから取得
	FindUserByMemberCode(
		ctx context.Context,
		memberCode string,
	) (*model.User, error)

	// ユーザーに登録されたパスキーを取得
	FindPasskeysByUserID(
		ctx context.Context,
		userID uuid.UUID,
	) ([]model.Passkey, error)

	// 認証情報IDからパスキーを取得
	FindPasskeyByCredentialID(
		ctx context.Context,
		credentialID []byte,
	) (*model.Passkey, error)

	// パスキーを登録
	CreatePasskey(
		ctx context.Context,
		passkey *model.Passkey,
	) error

	// 認証成功後のパスキー情報を更新
	UpdatePasskey(
		ctx context.Context,
		passkey *model.Passkey,
	) error
}
