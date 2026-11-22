package service

import (
	"context"
	"errors"
	"math"
	"strings"
	"unicode/utf8"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
)

var ErrInvalidSettings = errors.New("設定情報が不正です")

type SettingsService struct {
	repo repository.SettingsRepository
}

func NewSettingsService(
	repo repository.SettingsRepository,
) *SettingsService {
	return &SettingsService{
		repo: repo,
	}
}

// GetSettings は、共有設定を取得します。
func (s *SettingsService) GetSettings(
	ctx context.Context,
) (model.HouseholdSettings, error) {
	return s.repo.Get(ctx)
}

// UpdateSettings は、設定値を検証してから保存します。
func (s *SettingsService) UpdateSettings(
	ctx context.Context,
	settings model.HouseholdSettings,
) error {
	if err := validateSettings(settings); err != nil {
		return err
	}

	return s.repo.Update(ctx, settings)
}

// validateSettings は、設定値の妥当性を検証します。
func validateSettings(
	settings model.HouseholdSettings,
) error {
	if err := validateName(
		settings.HouseholdName,
		100,
	); err != nil {
		return err
	}

	if err := validateName(
		settings.MemberNames.A,
		50,
	); err != nil {
		return err
	}

	if err := validateName(
		settings.MemberNames.B,
		50,
	); err != nil {
		return err
	}

	percent := settings.DefaultSharePercentA

	if math.IsNaN(percent) ||
		math.IsInf(percent, 0) ||
		percent < 0 ||
		percent > 100 {
		return ErrInvalidSettings
	}

	// DBのNUMERIC(5,2)に合わせ、小数第2位まで許可します。
	scaled := percent * 100

	if math.Abs(scaled-math.Round(scaled)) > 1e-7 {
		return ErrInvalidSettings
	}

	return nil
}

func validateName(
	value string,
	maxLength int,
) error {
	trimmed := strings.TrimSpace(value)

	if trimmed == "" {
		return ErrInvalidSettings
	}

	if utf8.RuneCountInString(value) > maxLength {
		return ErrInvalidSettings
	}

	return nil
}
