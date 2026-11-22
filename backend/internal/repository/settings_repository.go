package repository

import (
	"context"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

// SettingsRepository は、家計簿設定の永続化処理を定義します。
type SettingsRepository interface {
	// Get は、共有設定を取得します。
	Get(ctx context.Context) (model.HouseholdSettings, error)

	// Update は、共有設定を更新します。
	Update(
		ctx context.Context,
		settings model.HouseholdSettings,
	) error
}
