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

	db, err := config.NewDatabase(context.Background())
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer db.Close()

	log.Println("Neon PostgreSQL connected")

	// 支出管理
	expenseRepository := repository.NewPostgresExpenseRepository(db)
	expenseService := service.NewExpenseService(expenseRepository)
	expenseHandler := handler.NewExpenseHandler(expenseService)

	// 精算管理
	settlementRepo := repository.NewPostgresSettlementRepository(db)
	settlementService := service.NewSettlementService(settlementRepo)
	settlementHandler := handler.NewSettlementHandler(settlementService)

	// 未精算残高
	balanceService := service.NewBalanceService(
		expenseRepository,
		settlementRepo,
	)
	balanceHandler := handler.NewBalanceHandler(balanceService)

	mux := http.NewServeMux()

	// ヘルスチェック
	mux.HandleFunc("GET /health", handler.Health)

	// 支出管理API
	mux.HandleFunc("GET /api/expenses", expenseHandler.FindAll)
	mux.HandleFunc("GET /api/expenses/{id}", expenseHandler.FindByID)
	mux.HandleFunc("POST /api/expenses", expenseHandler.Create)
	mux.HandleFunc("PUT /api/expenses/{id}", expenseHandler.Update)
	mux.HandleFunc("DELETE /api/expenses/{id}", expenseHandler.Delete)

	// 精算管理API
	mux.HandleFunc("GET /api/settlements", settlementHandler.GetAll)
	mux.HandleFunc("POST /api/settlements", settlementHandler.Create)
	mux.HandleFunc("DELETE /api/settlements/{id}", settlementHandler.Delete)

	// 未精算残高API
	mux.HandleFunc("GET /api/balance", balanceHandler.GetBalance)

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
	}

	log.Printf("API server listening on port %s", port)

	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
