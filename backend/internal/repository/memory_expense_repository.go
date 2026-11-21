package repository

import (
	"context"
	"errors"
	"sort"
	"sync"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

var (
	ErrNotFound      = errors.New("データが見つかりません")
	ErrAlreadyExists = errors.New("データが既に存在します")
)

type MemoryExpenseRepository struct {
	mu       sync.RWMutex
	expenses map[string]model.Expense
}

func NewMemoryExpenseRepository() *MemoryExpenseRepository {
	return &MemoryExpenseRepository{
		expenses: make(map[string]model.Expense),
	}
}

func (r *MemoryExpenseRepository) FindAll(
	ctx context.Context,
) ([]model.Expense, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}

	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]model.Expense, 0, len(r.expenses))

	for _, expense := range r.expenses {
		result = append(result, expense)
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Date == result[j].Date {
			return result[i].ID < result[j].ID
		}
		return result[i].Date > result[j].Date
	})

	return result, nil
}

func (r *MemoryExpenseRepository) FindByID(
	ctx context.Context,
	id string,
) (*model.Expense, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}

	r.mu.RLock()
	defer r.mu.RUnlock()

	expense, exists := r.expenses[id]
	if !exists {
		return nil, ErrNotFound
	}

	return &expense, nil
}

func (r *MemoryExpenseRepository) Create(
	ctx context.Context,
	expense model.Expense,
) error {
	if err := ctx.Err(); err != nil {
		return err
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.expenses[expense.ID]; exists {
		return ErrAlreadyExists
	}

	r.expenses[expense.ID] = expense
	return nil
}

func (r *MemoryExpenseRepository) Update(
	ctx context.Context,
	expense model.Expense,
) error {
	if err := ctx.Err(); err != nil {
		return err
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.expenses[expense.ID]; !exists {
		return ErrNotFound
	}

	r.expenses[expense.ID] = expense
	return nil
}

func (r *MemoryExpenseRepository) Delete(
	ctx context.Context,
	id string,
) error {
	if err := ctx.Err(); err != nil {
		return err
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.expenses[id]; !exists {
		return ErrNotFound
	}

	delete(r.expenses, id)
	return nil
}

var _ ExpenseRepository = (*MemoryExpenseRepository)(nil)
