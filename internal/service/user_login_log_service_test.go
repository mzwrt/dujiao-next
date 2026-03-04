package service

import (
	"strings"
	"testing"
	"unicode/utf8"
)

func TestTruncateUserAgent(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"empty", "", ""},
		{"whitespace only", "   ", ""},
		{"short UA", "Mozilla/5.0", "Mozilla/5.0"},
		{"exactly max bytes", strings.Repeat("a", maxUserAgentBytes), strings.Repeat("a", maxUserAgentBytes)},
		{"over max bytes", strings.Repeat("a", maxUserAgentBytes+1), strings.Repeat("a", maxUserAgentBytes)},
		{"far over max bytes", strings.Repeat("x", maxUserAgentBytes*10), strings.Repeat("x", maxUserAgentBytes)},
		{"leading whitespace trimmed", "  Mozilla/5.0  ", "Mozilla/5.0"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := truncateUserAgent(tc.input)
			if got != tc.want {
				t.Fatalf("truncateUserAgent: len(got)=%d want len=%d", len(got), len(tc.want))
			}
			if len(got) > maxUserAgentBytes {
				t.Fatalf("truncateUserAgent result exceeds maxUserAgentBytes: len=%d", len(got))
			}
			if !utf8.ValidString(got) {
				t.Fatalf("truncateUserAgent result is not valid UTF-8")
			}
		})
	}
}

func TestTruncateUserAgentUTF8Boundary(t *testing.T) {
	// Build a string of maxUserAgentBytes ASCII chars followed by a 3-byte UTF-8 rune (€ = 0xE2 0x82 0xAC).
	// Naive byte-slicing at maxUserAgentBytes would land inside the 3-byte sequence, producing invalid UTF-8.
	// Our implementation must yield valid UTF-8 and must not exceed maxUserAgentBytes bytes.
	base := strings.Repeat("a", maxUserAgentBytes-1)
	input := base + "€" // "€" is 3 bytes; total len = maxUserAgentBytes-1+3 = maxUserAgentBytes+2

	got := truncateUserAgent(input)
	if len(got) > maxUserAgentBytes {
		t.Fatalf("truncated UA exceeds maxUserAgentBytes: len=%d", len(got))
	}
	if !utf8.ValidString(got) {
		t.Fatalf("truncated UA is not valid UTF-8")
	}
	// The last character must not be a partial rune.
	if got != base {
		t.Fatalf("unexpected truncation result: got %q, want %q", got, base)
	}
}
