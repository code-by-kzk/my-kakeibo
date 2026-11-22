package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/tajimak1106/my-kakeibo/backend/internal/config"
	"github.com/tajimak1106/my-kakeibo/backend/internal/repository"
	"github.com/tajimak1106/my-kakeibo/backend/internal/service"
)

func main() {
	log.SetFlags(0)

	if len(os.Args) != 2 {
		log.Fatal("usage: go run ./cmd/setup-token A|B")
	}

	memberCode := strings.ToUpper(strings.TrimSpace(os.Args[1]))
	if memberCode != "A" && memberCode != "B" {
		log.Fatal("member code must be A or B")
	}

	ctx, cancel := context.WithTimeout(
		context.Background(),
		15*time.Second,
	)
	defer cancel()

	db, err := config.NewDatabase(ctx)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer db.Close()

	authRepo := repository.NewPostgresAuthRepository(db)

	user, err := authRepo.FindUserByMemberCode(ctx, memberCode)
	if err != nil {
		log.Fatalf("find user failed: %v", err)
	}
	if user == nil {
		log.Fatalf("user %s not found", memberCode)
	}

	passkeys, err := authRepo.FindPasskeysByUserID(ctx, user.ID)
	if err != nil {
		log.Fatalf("find passkeys failed: %v", err)
	}
	if len(passkeys) > 0 {
		log.Fatalf(
			"user %s already has a passkey; initial setup is not allowed",
			memberCode,
		)
	}

	setupRepo := repository.NewPostgresPasskeySetupTokenRepository(db)
	setupService := service.NewPasskeySetupTokenService(setupRepo)

	token, err := setupService.Issue(ctx, user.ID)
	if err != nil {
		log.Fatalf("issue setup token failed: %v", err)
	}

	fmt.Printf("Member: %s\n", memberCode)
	fmt.Println("Setup token (secret):")
	fmt.Println(token)
	fmt.Println("Expires in: 30 minutes")
	fmt.Println("Keep this token private. Do not commit or log it.")
}
