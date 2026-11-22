package service

import (
	"context"
	"errors"
	"strings"
	"unicode/utf8"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
)

var ErrInvalidCategoryName = errors.New(
	"カテゴリ名は1〜50文字で入力してください",
)

type CategoryService struct {
	repo *repository.PostgresCategoryRepository
}

func NewCategoryService(
	repo *repository.PostgresCategoryRepository,
) *CategoryService {
	return &CategoryService{repo: repo}
}

func validateCategoryName(name string) (string, error) {
	name = strings.TrimSpace(name)

	length := utf8.RuneCountInString(name)

	if length == 0 || length > 50 {
		return "", ErrInvalidCategoryName
	}

	return name, nil
}

func (s *CategoryService) FindAll(
	ctx context.Context,
) ([]model.ExpenseCategory, error) {
	return s.repo.FindAll(ctx)
}

func (s *CategoryService) Create(
	ctx context.Context,
	name string,
) (*model.ExpenseCategory, error) {
	name, err := validateCategoryName(name)
	if err != nil {
		return nil, err
	}

	return s.repo.Create(ctx, name)
}

func (s *CategoryService) Update(
	ctx context.Context,
	id string,
	name string,
) (*model.ExpenseCategory, error) {
	name, err := validateCategoryName(name)
	if err != nil {
		return nil, err
	}

	return s.repo.Update(ctx, id, name)
}

func (s *CategoryService) Delete(
	ctx context.Context,
	id string,
) error {
	return s.repo.Delete(ctx, id)
}
