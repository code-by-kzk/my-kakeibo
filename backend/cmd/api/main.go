package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/tajimak1106/my-kakeibo/backend/internal/config"
	"github.com/tajimak1106/my-kakeibo/backend/internal/handler"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
	"github.com/tajimak1106/my-kakeibo/backend/internal/service"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// ========================================
	// PostgreSQL接続
	// ========================================

	db, err := config.NewDatabase(context.Background())
	if err != nil {
		log.Fatalf(
			"database connection failed: %v",
			err,
		)
	}
	defer db.Close()

	log.Println("Neon PostgreSQL connected")

	// ========================================
	// 支出管理
	// ========================================

	expenseRepository :=
		repository.NewPostgresExpenseRepository(db)

	expenseService :=
		service.NewExpenseService(expenseRepository)

	expenseHandler :=
		handler.NewExpenseHandler(expenseService)

	// ========================================
	// 精算管理
	// ========================================

	settlementRepo :=
		repository.NewPostgresSettlementRepository(db)

	settlementService :=
		service.NewSettlementService(settlementRepo)

	settlementHandler :=
		handler.NewSettlementHandler(settlementService)

	// ========================================
	// 未精算残高
	// ========================================

	balanceService := service.NewBalanceService(
		expenseRepository,
		settlementRepo,
	)

	balanceHandler :=
		handler.NewBalanceHandler(balanceService)

	// ========================================
	// 家計簿の共有設定
	// ========================================

	settingsRepository :=
		repository.NewPostgresSettingsRepository(db)

	settingsService :=
		service.NewSettingsService(settingsRepository)

	settingsHandler :=
		handler.NewSettingsHandler(settingsService)

	// ========================================
	// セッション管理
	// ========================================

	sessionRepo :=
		repository.NewPostgresSessionRepository(db)

	sessionService :=
		service.NewSessionService(sessionRepo)

	// ========================================
	// WebAuthn
	// ========================================

	webAuthn, err := config.NewWebAuthn()
	if err != nil {
		log.Fatalf(
			"WebAuthn initialization failed: %v",
			err,
		)
	}

	// ========================================
	// パスキー初期登録
	// ========================================

	authRepo :=
		repository.NewPostgresAuthRepository(db)

	setupTokenRepo :=
		repository.NewPostgresPasskeySetupTokenRepository(db)

	setupTokenService :=
		service.NewPasskeySetupTokenService(
			setupTokenRepo,
		)

	challengeRepo :=
		repository.NewPostgresWebAuthnChallengeRepository(db)

	challengeService :=
		service.NewWebAuthnChallengeService(
			challengeRepo,
		)

	registrationRepo :=
		repository.NewPostgresPasskeyRegistrationRepository(db)

	registrationService :=
		service.NewPasskeyRegistrationService(
			webAuthn,
			authRepo,
			challengeService,
			setupTokenService,
			registrationRepo,
		)

	registrationHandler :=
		handler.NewPasskeyRegistrationHandler(
			registrationService,
		)

	// ========================================
	// パスキーログイン
	// ========================================

	loginService := service.NewPasskeyLoginService(
		webAuthn,
		authRepo,
		challengeService,
		sessionService,
	)

	loginHandler :=
		handler.NewPasskeyLoginHandler(
			loginService,
			sessionService,
		)

	// ========================================
	// レート制限
	// ========================================

	// ログインAPI：
	// 開始・完了の合計で1分間10回
	loginRateLimiter := handler.NewRateLimiter(
		10,
		time.Minute,
	)

	// 初期登録API：
	// 開始・完了の合計で1分間5回
	registrationRateLimiter := handler.NewRateLimiter(
		5,
		time.Minute,
	)

	// ========================================
	// 認証不要のルーティング
	// ========================================

	mux := http.NewServeMux()

	// ヘルスチェック
	mux.HandleFunc(
		"GET /health",
		handler.Health,
	)

	// ========================================
	// パスキー初期登録API
	// ========================================

	// 初期登録：開始
	mux.HandleFunc(
		"POST /api/auth/passkey/register/begin",
		registrationRateLimiter.Middleware(
			registrationHandler.Begin,
		),
	)

	// 初期登録：完了
	mux.HandleFunc(
		"POST /api/auth/passkey/register/finish",
		registrationRateLimiter.Middleware(
			registrationHandler.Finish,
		),
	)

	// ========================================
	// パスキーログインAPI
	// ========================================

	// ログイン：開始
	mux.HandleFunc(
		"POST /api/auth/passkey/login/begin",
		loginRateLimiter.Middleware(
			loginHandler.Begin,
		),
	)

	// ログイン：完了
	mux.HandleFunc(
		"POST /api/auth/passkey/login/finish",
		loginRateLimiter.Middleware(
			loginHandler.Finish,
		),
	)

	// ========================================
	// ログアウトAPI
	// ========================================

	mux.HandleFunc(
		"POST /api/auth/logout",
		loginHandler.Logout,
	)

	// ========================================
	// 認証必須のルーティング
	// ========================================

	protectedMux := http.NewServeMux()

	// ========================================
	// ログイン状態確認
	// ========================================

	protectedMux.HandleFunc(
		"GET /api/auth/me",
		func(
			w http.ResponseWriter,
			r *http.Request,
		) {
			w.Header().Set(
				"Content-Type",
				"application/json",
			)

			w.WriteHeader(http.StatusOK)

			_, _ = w.Write(
				[]byte(`{"authenticated":true}`),
			)
		},
	)

	// ========================================
	// 支出管理API
	// ========================================

	protectedMux.HandleFunc(
		"GET /api/expenses",
		expenseHandler.FindAll,
	)

	protectedMux.HandleFunc(
		"GET /api/expenses/{id}",
		expenseHandler.FindByID,
	)

	protectedMux.HandleFunc(
		"POST /api/expenses",
		expenseHandler.Create,
	)

	protectedMux.HandleFunc(
		"PUT /api/expenses/{id}",
		expenseHandler.Update,
	)

	protectedMux.HandleFunc(
		"DELETE /api/expenses/{id}",
		expenseHandler.Delete,
	)

	// ========================================
	// 精算管理API
	// ========================================

	protectedMux.HandleFunc(
		"GET /api/settlements",
		settlementHandler.GetAll,
	)

	protectedMux.HandleFunc(
		"POST /api/settlements",
		settlementHandler.Create,
	)

	protectedMux.HandleFunc(
		"DELETE /api/settlements/{id}",
		settlementHandler.Delete,
	)

	// ========================================
	// 未精算残高API
	// ========================================

	protectedMux.HandleFunc(
		"GET /api/balance",
		balanceHandler.GetBalance,
	)

	// ========================================
	// 家計簿の共有設定API
	// ========================================

	protectedMux.HandleFunc(
		"GET /api/settings",
		settingsHandler.Get,
	)

	protectedMux.HandleFunc(
		"PUT /api/settings",
		settingsHandler.Update,
	)

	// ========================================
	// セッション認証ミドルウェア
	// ========================================

	protectedHandler := handler.RequireSession(
		sessionService,
		protectedMux,
	)

	// ログイン状態確認
	mux.Handle(
		"/api/auth/me",
		protectedHandler,
	)

	// 支出管理
	mux.Handle(
		"/api/expenses",
		protectedHandler,
	)

	mux.Handle(
		"/api/expenses/",
		protectedHandler,
	)

	// 精算管理
	mux.Handle(
		"/api/settlements",
		protectedHandler,
	)

	mux.Handle(
		"/api/settlements/",
		protectedHandler,
	)

	// 未精算残高
	mux.Handle(
		"/api/balance",
		protectedHandler,
	)

	// 共有設定
	mux.Handle(
		"/api/settings",
		protectedHandler,
	)

	// ========================================
	// CSRF対策：Origin検証
	// ========================================

	trustedOrigin := os.Getenv(
		"WEBAUTHN_RP_ORIGIN",
	)

	if trustedOrigin == "" {
		log.Fatal(
			"WEBAUTHN_RP_ORIGIN is required",
		)
	}

	securedHandler :=
		handler.RequireTrustedOrigin(
			trustedOrigin,
			mux,
		)

	// ========================================
	// HTTPサーバー
	// ========================================

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           securedHandler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
	}

	log.Printf(
		"API server listening on port %s",
		port,
	)

	if err := server.ListenAndServe(); err != nil &&
		err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
