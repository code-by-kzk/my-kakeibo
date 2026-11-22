package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

// PostgresSettingsRepository は、PostgreSQLを使用した
// SettingsRepositoryの実装です。
type PostgresSettingsRepository struct {
	db *pgxpool.Pool
}

// NewPostgresSettingsRepository はRepositoryを生成します。
func NewPostgresSettingsRepository(
	db *pgxpool.Pool,
) *PostgresSettingsRepository {
	return &PostgresSettingsRepository{
		db: db,
	}
}

// Get は、共有設定を取得します。
func (r *PostgresSettingsRepository) Get(
	ctx context.Context,
) (model.HouseholdSettings, error) {
	const query = `
		SELECT
			household_name,
			member_name_a,
			member_name_b,
			default_share_percent_a
		FROM household_settings
		WHERE id = 1
	`

	var settings model.HouseholdSettings

	err := r.db.QueryRow(ctx, query).Scan(
		&settings.HouseholdName,
		&settings.MemberNames.A,
		&settings.MemberNames.B,
		&settings.DefaultSharePercentA,
	)
	if err != nil {
		return model.HouseholdSettings{},
			fmt.Errorf("設定情報の取得に失敗しました: %w", err)
	}

	return settings, nil
}

// Update は、共有設定を更新します。
func (r *PostgresSettingsRepository) Update(
	ctx context.Context,
	settings model.HouseholdSettings,
) error {
	const query = `
		UPDATE household_settings
		SET
			household_name = $1,
			member_name_a = $2,
			member_name_b = $3,
			default_share_percent_a = $4,
			updated_at = NOW()
		WHERE id = 1
	`

	result, err := r.db.Exec(
		ctx,
		query,
		settings.HouseholdName,
		settings.MemberNames.A,
		settings.MemberNames.B,
		settings.DefaultSharePercentA,
	)
	if err != nil {
		return fmt.Errorf(
			"設定情報の更新に失敗しました: %w",
			err,
		)
	}

	if result.RowsAffected() != 1 {
		return fmt.Errorf(
			"設定情報の更新対象が存在しません",
		)
	}

	return nil
}

// SettingsRepositoryインターフェースを実装していることを確認します。
var _ SettingsRepository = (*PostgresSettingsRepository)(nil)
