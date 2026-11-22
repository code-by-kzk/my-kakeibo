package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
	"github.com/tajimak1106/my-kakeibo/backend/internal/service"
)

type CategoryHandler struct {
	service *service.CategoryService
}

func NewCategoryHandler(
	categoryService *service.CategoryService,
) *CategoryHandler {
	return &CategoryHandler{
		service: categoryService,
	}
}

type categoryRequest struct {
	Name string `json:"name"`
}

func decodeCategoryRequest(
	w http.ResponseWriter,
	r *http.Request,
) (categoryRequest, error) {
	defer r.Body.Close()

	r.Body = http.MaxBytesReader(w, r.Body, 16*1024)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	var request categoryRequest

	if err := decoder.Decode(&request); err != nil {
		return request, err
	}

	var extra json.RawMessage

	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		return request, errors.New("invalid JSON")
	}

	return request, nil
}

func writeCategoryError(
	w http.ResponseWriter,
	err error,
) {
	switch {
	case errors.Is(err, service.ErrInvalidCategoryName):
		http.Error(
			w,
			err.Error(),
			http.StatusBadRequest,
		)

	case errors.Is(err, repository.ErrCategoryNotFound):
		http.Error(
			w,
			err.Error(),
			http.StatusNotFound,
		)

	case errors.Is(err, repository.ErrCategoryInUse),
		errors.Is(err, repository.ErrCategoryConflict):
		http.Error(
			w,
			err.Error(),
			http.StatusConflict,
		)

	default:
		http.Error(
			w,
			"カテゴリの処理に失敗しました",
			http.StatusInternalServerError,
		)
	}
}

func (h *CategoryHandler) FindAll(
	w http.ResponseWriter,
	r *http.Request,
) {
	categories, err := h.service.FindAll(r.Context())
	if err != nil {
		writeCategoryError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	_ = json.NewEncoder(w).Encode(categories)
}

func (h *CategoryHandler) Create(
	w http.ResponseWriter,
	r *http.Request,
) {
	request, err := decodeCategoryRequest(w, r)
	if err != nil {
		http.Error(
			w,
			"リクエスト形式が不正です",
			http.StatusBadRequest,
		)
		return
	}

	category, err := h.service.Create(
		r.Context(),
		request.Name,
	)
	if err != nil {
		writeCategoryError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	_ = json.NewEncoder(w).Encode(category)
}

func (h *CategoryHandler) Update(
	w http.ResponseWriter,
	r *http.Request,
) {
	request, err := decodeCategoryRequest(w, r)
	if err != nil {
		http.Error(
			w,
			"リクエスト形式が不正です",
			http.StatusBadRequest,
		)
		return
	}

	category, err := h.service.Update(
		r.Context(),
		r.PathValue("id"),
		request.Name,
	)
	if err != nil {
		writeCategoryError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	_ = json.NewEncoder(w).Encode(category)
}

func (h *CategoryHandler) Delete(
	w http.ResponseWriter,
	r *http.Request,
) {
	err := h.service.Delete(
		r.Context(),
		r.PathValue("id"),
	)
	if err != nil {
		writeCategoryError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
