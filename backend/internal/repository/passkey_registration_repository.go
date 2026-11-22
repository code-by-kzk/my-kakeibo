package repository

import (
	"context"

	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

// PasskeyRegistrationRepositoryは、
// WebAuthn初期登録の確定処理を管理します。
type PasskeyRegistrationRepository interface {
	// CompleteRegistrationは検証済みパスキーを保存します。
	//
	// 以下の処理を単一トランザクションで実行します。
	//
	// 1. ユーザー行のロック
	// 2. 初期登録済みでないことの確認
	// 3. チャレンジの有効性と紐付けの再確認・消費
	// 4. 初期登録トークンの有効性と紐付けの再確認・消費
	// 5. パスキーの保存
	//
	// いずれかが失敗した場合はロールバックします。
	//
	// 呼び出し元は、事前にWebAuthnの登録応答を
	// 暗号学的に検証している必要があります。
	CompleteRegistration(
		ctx context.Context,
		userID uuid.UUID,
		setupTokenID uuid.UUID,
		challengeID uuid.UUID,
		passkey *model.Passkey,
	) error
}
