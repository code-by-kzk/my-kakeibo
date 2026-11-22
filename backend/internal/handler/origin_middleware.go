package handler

import (
	"net/http"
	"net/url"
	"strings"
)

// RequireTrustedOrigin は、状態変更リクエストの
// Origin / Referer を検証します。
func RequireTrustedOrigin(
	allowedOrigin string,
	next http.Handler,
) http.Handler {
	allowedOrigin = strings.TrimRight(
		strings.TrimSpace(allowedOrigin),
		"/",
	)

	if allowedOrigin == "" {
		panic("trusted origin must not be empty")
	}

	allowedURL, err := url.Parse(allowedOrigin)
	if err != nil ||
		allowedURL.Scheme == "" ||
		allowedURL.Host == "" ||
		allowedURL.User != nil ||
		allowedURL.RawQuery != "" ||
		allowedURL.Fragment != "" ||
		(allowedURL.Path != "" && allowedURL.Path != "/") {
		panic("invalid trusted origin")
	}

	allowedOrigin = allowedURL.Scheme + "://" +
		allowedURL.Host

	return http.HandlerFunc(func(
		w http.ResponseWriter,
		r *http.Request,
	) {
		switch r.Method {
		case http.MethodGet,
			http.MethodHead,
			http.MethodOptions:
			next.ServeHTTP(w, r)
			return
		}

		origin := r.Header.Get("Origin")

		if origin != "" {
			if origin != allowedOrigin {
				http.Error(
					w,
					"Forbidden",
					http.StatusForbidden,
				)
				return
			}
		} else {
			// Originがない場合はRefererで確認する
			referer := r.Header.Get("Referer")
			refererURL, err := url.Parse(referer)

			if err != nil ||
				refererURL.Scheme == "" ||
				refererURL.Host == "" ||
				refererURL.Scheme+"://"+
					refererURL.Host != allowedOrigin {
				http.Error(
					w,
					"Forbidden",
					http.StatusForbidden,
				)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}
