package public

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// sitemapURL represents a single <url> element in the sitemap.
type sitemapURL struct {
	XMLName    xml.Name `xml:"url"`
	Loc        string   `xml:"loc"`
	LastMod    string   `xml:"lastmod,omitempty"`
	ChangeFreq string   `xml:"changefreq,omitempty"`
	Priority   string   `xml:"priority,omitempty"`
}

// sitemapURLSet represents the root <urlset> element.
type sitemapURLSet struct {
	XMLName xml.Name     `xml:"urlset"`
	XMLNS   string       `xml:"xmlns,attr"`
	URLs    []sitemapURL `xml:"url"`
}

// GetSitemap generates a dynamic sitemap.xml with products and blog posts.
func (h *Handler) GetSitemap(c *gin.Context) {
	baseURL := resolveBaseURL(c)

	urls := []sitemapURL{
		{Loc: baseURL + "/", ChangeFreq: "daily", Priority: "1.0"},
		{Loc: baseURL + "/products", ChangeFreq: "daily", Priority: "0.9"},
		{Loc: baseURL + "/blog", ChangeFreq: "weekly", Priority: "0.8"},
		{Loc: baseURL + "/notice", ChangeFreq: "weekly", Priority: "0.6"},
		{Loc: baseURL + "/about", ChangeFreq: "monthly", Priority: "0.5"},
		{Loc: baseURL + "/terms", ChangeFreq: "monthly", Priority: "0.3"},
		{Loc: baseURL + "/privacy", ChangeFreq: "monthly", Priority: "0.3"},
	}

	// Add product pages (fetch up to sitemapMaxItems)
	products, _, err := h.ProductService.ListPublic("", "", 1, 1000)
	if err == nil {
		for _, p := range products {
			u := sitemapURL{
				Loc:        fmt.Sprintf("%s/products/%s", baseURL, p.Slug),
				ChangeFreq: "weekly",
				Priority:   "0.8",
			}
			if !p.UpdatedAt.IsZero() {
				u.LastMod = p.UpdatedAt.Format(time.RFC3339)
			}
			urls = append(urls, u)
		}
	}

	// Add blog/notice pages (fetch up to sitemapMaxItems)
	posts, _, err := h.PostService.ListPublic("", 1, 1000)
	if err == nil {
		for _, p := range posts {
			u := sitemapURL{
				Loc:        fmt.Sprintf("%s/blog/%s", baseURL, p.Slug),
				ChangeFreq: "monthly",
				Priority:   "0.7",
			}
			if !p.CreatedAt.IsZero() {
				u.LastMod = p.CreatedAt.Format(time.RFC3339)
			}
			urls = append(urls, u)
		}
	}

	sitemap := sitemapURLSet{
		XMLNS: "http://www.sitemaps.org/schemas/sitemap/0.9",
		URLs:  urls,
	}

	output, err := xml.MarshalIndent(sitemap, "", "  ")
	if err != nil {
		c.String(http.StatusInternalServerError, "failed to generate sitemap")
		return
	}

	c.Header("Content-Type", "application/xml; charset=utf-8")
	c.Header("Cache-Control", "public, max-age=3600")
	c.String(http.StatusOK, xml.Header+string(output))
}

// resolveBaseURL builds the site's base URL from the request.
// Scheme is validated to only allow "http" or "https" (prevents scheme injection via
// X-Forwarded-Proto). Host is sanitized to strip any path/query/fragment components
// and control characters (CWE-113 / CIS 5.1 — Host header injection).
func resolveBaseURL(c *gin.Context) string {
	scheme := "https"
	proto := strings.ToLower(strings.TrimSpace(c.GetHeader("X-Forwarded-Proto")))
	switch proto {
	case "http":
		scheme = "http"
	case "https":
		scheme = "https"
	default:
		// Unknown or empty proto — fall back based on actual TLS state.
		if c.Request.TLS == nil {
			scheme = "http"
		}
	}
	return fmt.Sprintf("%s://%s", scheme, sanitizeSitemapHost(c.Request.Host))
}

// sanitizeSitemapHost removes path, query, and fragment components from a Host
// header value and truncates at the first CRLF to prevent header injection.
// Only valid hostname characters are kept (allowlist) to prevent injection via
// Unicode or C1 control characters (CWE-113 / PCI-DSS 6.5.1).
// Valid characters: alphanumeric, hyphen, dot (hostname), colon (port separator),
// and square brackets (IPv6 address literals).
func sanitizeSitemapHost(host string) string {
	// Truncate at the first CR or LF to prevent CRLF header-injection attacks.
	if i := strings.IndexAny(host, "\r\n"); i >= 0 {
		host = host[:i]
	}
	// Strip any path, query, or fragment that an attacker appended to the Host value.
	if i := strings.IndexAny(host, "/?#"); i >= 0 {
		host = host[:i]
	}
	// Allowlist: keep only characters valid in a hostname[:port] or IPv6 literal.
	host = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') ||
			r == '-' || r == '.' || r == ':' || r == '[' || r == ']' {
			return r
		}
		return -1
	}, host)
	return host
}
