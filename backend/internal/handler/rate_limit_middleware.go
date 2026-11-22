package handler

import (
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"
)

const (
	// IPアドレスの最大保持件数
	defaultMaxEntries = 10000

	// 期限切れエントリの削除間隔
	defaultCleanupInterval = time.Minute
)

// rateLimitEntry はIPアドレスごとの
// リクエスト回数と計測開始時刻を保持します。
type rateLimitEntry struct {
	count       int
	windowStart time.Time
}

// RateLimiter は一定時間内の
// リクエスト回数を制限します。
type RateLimiter struct {
	mu      sync.Mutex
	entries map[string]rateLimitEntry

	limit  int
	window time.Duration

	maxEntries      int
	cleanupInterval time.Duration
	lastCleanup     time.Time
}

// NewRateLimiter はレート制限を初期化します。
func NewRateLimiter(
	limit int,
	window time.Duration,
) *RateLimiter {
	if limit <= 0 || window <= 0 {
		panic("invalid rate limit configuration")
	}

	return &RateLimiter{
		entries: make(map[string]rateLimitEntry),

		limit:  limit,
		window: window,

		maxEntries:      defaultMaxEntries,
		cleanupInterval: defaultCleanupInterval,
		lastCleanup:     time.Now(),
	}
}

// cleanupExpired は期限切れの
// エントリを削除します。
// 呼び出し元はmuをロックしている必要があります。
func (rl *RateLimiter) cleanupExpired(
	now time.Time,
) {
	for key, entry := range rl.entries {
		if now.Sub(entry.windowStart) >= rl.window {
			delete(rl.entries, key)
		}
	}

	rl.lastCleanup = now
}

// Allow は指定されたキーの
// アクセスを許可するか判定します。
func (rl *RateLimiter) Allow(
	key string,
) (bool, time.Duration) {
	now := time.Now()

	rl.mu.Lock()
	defer rl.mu.Unlock()

	// 一定間隔で期限切れデータを削除
	if now.Sub(rl.lastCleanup) >= rl.cleanupInterval {
		rl.cleanupExpired(now)
	}

	entry, exists := rl.entries[key]

	// 既存エントリの計測期間が終了していた場合
	if exists && now.Sub(entry.windowStart) >= rl.window {
		delete(rl.entries, key)
		exists = false
	}

	// 初回アクセス
	if !exists {
		// 最大保持件数に達している場合は
		// 期限切れエントリを再確認
		if len(rl.entries) >= rl.maxEntries {
			rl.cleanupExpired(now)
		}

		// それでも満杯の場合は安全側に倒して拒否
		if len(rl.entries) >= rl.maxEntries {
			return false, rl.window
		}

		rl.entries[key] = rateLimitEntry{
			count:       1,
			windowStart: now,
		}

		return true, 0
	}

	// 制限回数を超過
	if entry.count >= rl.limit {
		retryAfter := rl.window -
			now.Sub(entry.windowStart)

		if retryAfter < 0 {
			retryAfter = 0
		}

		return false, retryAfter
	}

	// リクエスト回数を加算
	entry.count++
	rl.entries[key] = entry

	return true, 0
}

// Middleware はHTTPリクエストに
// レート制限を適用します。
func (rl *RateLimiter) Middleware(
	next http.HandlerFunc,
) http.HandlerFunc {
	return func(
		w http.ResponseWriter,
		r *http.Request,
	) {
		// 接続元IPアドレスを取得
		ip, _, err := net.SplitHostPort(
			r.RemoteAddr,
		)

		if err != nil {
			ip = r.RemoteAddr
		}

		allowed, retryAfter := rl.Allow(ip)

		if !allowed {
			// Retry-Afterは秒単位で指定
			seconds := int(
				(retryAfter +
					time.Second - 1) /
					time.Second,
			)

			if seconds < 1 {
				seconds = 1
			}

			w.Header().Set(
				"Retry-After",
				strconv.Itoa(seconds),
			)

			http.Error(
				w,
				"Too Many Requests",
				http.StatusTooManyRequests,
			)

			return
		}

		// 制限内の場合は通常処理
		next(w, r)
	}
}
