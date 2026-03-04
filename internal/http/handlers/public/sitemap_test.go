package public

import (
	"crypto/tls"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestResolveBaseURLSchemeValidation(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cases := []struct {
		name           string
		forwardedProto string
		hasTLS         bool
		wantScheme     string
	}{
		{"no headers, no TLS", "", false, "http"},
		{"no headers, with TLS", "", true, "https"},
		{"forwarded proto http", "http", false, "http"},
		{"forwarded proto https", "https", false, "https"},
		// Invalid non-http/https schemes must be rejected; fall back to TLS state.
		// No TLS present → scheme is "http" (safe fallback, not the injected value).
		{"injected javascript scheme", "javascript", false, "http"},
		{"injected ftp scheme", "ftp", false, "http"},
		// Whitespace-only proto is treated as missing header → falls back to http (no TLS).
		{"whitespace-only proto, no TLS", "   ", false, "http"},
		{"forwarded proto HTTP uppercase", "HTTP", false, "http"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			req := httptest.NewRequest("GET", "/sitemap.xml", nil)
			if tc.forwardedProto != "" {
				req.Header.Set("X-Forwarded-Proto", tc.forwardedProto)
			}
			if tc.hasTLS {
				req.TLS = &tls.ConnectionState{}
			}
			c.Request = req

			got := resolveBaseURL(c)
			if len(got) < len(tc.wantScheme)+3 {
				t.Fatalf("want scheme %q in URL %q", tc.wantScheme, got)
			}
			gotScheme := got[:len(tc.wantScheme)]
			if gotScheme != tc.wantScheme {
				t.Fatalf("want scheme %q, got %q (full URL: %q)", tc.wantScheme, gotScheme, got)
			}
		})
	}
}

func TestSanitizeSitemapHost(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"example.com", "example.com"},
		{"example.com:8080", "example.com:8080"},
		// Path/query/fragment injection must be stripped.
		{"example.com/path", "example.com"},
		{"example.com?query=1", "example.com"},
		{"example.com#fragment", "example.com"},
		{"example.com/path?q=1#frag", "example.com"},
		// CRLF injection must be truncated at the first CRLF.
		{"example.com\r\nX-Injected: header", "example.com"},
		{"example.com\nX-Injected: header", "example.com"},
		// Tab characters are removed by the allowlist; remaining text characters
		// are kept (no truncation at tab, only at CRLF).
		{"evil.com\ttab", "evil.comtab"},
		// Trailing/leading whitespace must be stripped.
		{"example.com ", "example.com"},
		{" example.com", "example.com"},
	}

	for _, tc := range cases {
		t.Run(tc.input, func(t *testing.T) {
			got := sanitizeSitemapHost(tc.input)
			if got != tc.want {
				t.Fatalf("sanitizeSitemapHost(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}
