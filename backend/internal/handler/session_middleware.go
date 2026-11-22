package handler

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/tajimak1106/my-kakeibo/backend/internal/model"
)

const SessionCookieName = "kakeibo_session"

type SessionValidator interface {
	ValidateSession(
		ctx context.Context,
		token string,
	) (*model.Session, error)
}

type authenticatedUserKey struct{}

// RequireSessionは有効なログインセッションを要求します。
func RequireSession(
	validator SessionValidator,
	next http.Handler,
) http.Handler {
	return http.HandlerFunc(func(
		w http.ResponseWriter,
		r *http.Request,
	) {
		cookie, err := r.Cookie(SessionCookieName)
		if err != nil || cookie.Value == "" {
			writeError(
				w,
				http.StatusUnauthorized,
				"ログインが必要です",
			)
			return
		}

		session, err := validator.ValidateSession(
			r.Context(),
			cookie.Value,
		)
		if err != nil || session == nil {
			writeError(
				w,
				http.StatusUnauthorized,
				"セッションが無効です",
			)
			return
		}

		ctx := context.WithValue(
			r.Context(),
			authenticatedUserKey{},
			session.UserID,
		)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// AuthenticatedUserIDは認証済みユーザーIDを取得します。
func AuthenticatedUserID(
	ctx context.Context,
) (uuid.UUID, bool) {
	userID, ok := ctx.Value(
		authenticatedUserKey{},
	).(uuid.UUID)

	return userID, ok && userID != uuid.Nil
}
