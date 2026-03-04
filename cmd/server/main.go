package main

import (
	"flag"
	"fmt"
	"os"
	"strings"
	"syscall"

	"github.com/mzwrt/dujiao-next/internal/app"
	"github.com/mzwrt/dujiao-next/internal/config"
	"github.com/mzwrt/dujiao-next/internal/logger"
	"github.com/mzwrt/dujiao-next/internal/models"

	"github.com/gin-gonic/gin"
)

const (
	ansiReset     = "\033[0m"
	ansiBold      = "\033[1m"
	ansiDim       = "\033[2m"
	ansiGreen     = "\033[32m"
	ansiBlue      = "\033[34m"
	ansiCyan      = "\033[36m"
	ansiBrightMag = "\033[95m"
)

func main() {
	printStartupBanner()

	// 加载配置
	cfg := config.Load()
	logger.Init(cfg.Server.Mode, cfg.Log.ToLoggerOptions())
	stdLog := logger.StdLogger()

	if cfg.Server.Mode == "release" {
		if isWeakSecret(cfg.JWT.SecretKey) {
			stdLog.Fatalf("JWT secret (jwt.secret) 过弱或仍为默认值，请在生产环境中配置强随机密钥")
		}
		if isWeakSecret(cfg.UserJWT.SecretKey) {
			stdLog.Fatalf("User JWT secret (user_jwt.secret) 过弱或仍为默认值，请在生产环境中配置强随机密钥")
		}
		// PCI-DSS 4.1 — release 模式下 TLS 证书验证不应被跳过
		if cfg.Redis.TLSEnabled && cfg.Redis.TLSSkipVerify {
			stdLog.Printf("警告: Redis TLS 已启用但证书验证被跳过 (redis.tls_skip_verify=true)，生产环境应使用有效证书")
		}
		if cfg.Queue.TLSEnabled && cfg.Queue.TLSSkipVerify {
			stdLog.Printf("警告: Queue TLS 已启用但证书验证被跳过 (queue.tls_skip_verify=true)，生产环境应使用有效证书")
		}
	} else {
		if isWeakSecret(cfg.JWT.SecretKey) {
			stdLog.Printf("警告: JWT secret (jwt.secret) 过弱或仍为默认值，建议在生产环境中更换")
		}
		if isWeakSecret(cfg.UserJWT.SecretKey) {
			stdLog.Printf("警告: User JWT secret (user_jwt.secret) 过弱或仍为默认值，建议在生产环境中更换")
		}
	}

	// 初始化数据库 (PCI-DSS 10.2 — 使用 Warn 级别 SQL 日志，忽略预期的 ErrRecordNotFound)
	if err := models.InitDBWithMode(cfg.Database.Driver, cfg.Database.DSN, models.DBPoolConfig{
		MaxOpenConns:           cfg.Database.Pool.MaxOpenConns,
		MaxIdleConns:           cfg.Database.Pool.MaxIdleConns,
		ConnMaxLifetimeSeconds: cfg.Database.Pool.ConnMaxLifetimeSeconds,
		ConnMaxIdleTimeSeconds: cfg.Database.Pool.ConnMaxIdleTimeSeconds,
	}, cfg.Server.Mode); err != nil {
		stdLog.Fatalf("数据库初始化失败: %v", err)
	}

	// 自动迁移数据库表
	if err := models.AutoMigrate(); err != nil {
		stdLog.Fatalf("数据库迁移失败: %v", err)
	}

	// 初始化默认管理员账号
	defaultAdminUser, defaultAdminPass := resolveDefaultAdminCredentials(cfg)
	if err := models.InitDefaultAdmin(defaultAdminUser, defaultAdminPass); err != nil {
		stdLog.Printf("警告: 初始化默认管理员失败: %v", err)
	}

	// 设置 Gin 模式
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 解析命令行参数
	var mode string
	flag.StringVar(&mode, "mode", app.ModeAll, "启动模式: all (默认), api, worker")
	flag.Parse()

	if err := app.Run(app.Options{
		Config:  cfg,
		Logger:  logger.S(),
		Signals: []os.Signal{syscall.SIGINT, syscall.SIGTERM},
		Mode:    mode,
	}); err != nil {
		stdLog.Fatalf("服务运行失败: %v", err)
	}
}

func printStartupBanner() {
	fmt.Println(ansiBrightMag + "╔══════════════════════════════════════════════════════════════════════╗" + ansiReset)
	fmt.Println(ansiBrightMag + "║                      🚀 Dujiao-Next API 启动中                      ║" + ansiReset)
	fmt.Println(ansiBrightMag + "╚══════════════════════════════════════════════════════════════════════╝" + ansiReset)
	fmt.Println(ansiCyan + "██████╗ ██╗   ██╗     ██╗ █████╗  ██████╗      ███╗   ██╗███████╗██╗  ██╗████████╗" + ansiReset)
	fmt.Println(ansiCyan + "██╔══██╗██║   ██║     ██║██╔══██╗██╔═══██╗     ████╗  ██║██╔════╝╚██╗██╔╝╚══██╔══╝" + ansiReset)
	fmt.Println(ansiCyan + "██║  ██║██║   ██║     ██║███████║██║   ██║     ██╔██╗ ██║█████╗   ╚███╔╝    ██║   " + ansiReset)
	fmt.Println(ansiCyan + "██║  ██║██║   ██║██   ██║██╔══██║██║   ██║     ██║╚██╗██║██╔══╝   ██╔██╗    ██║   " + ansiReset)
	fmt.Println(ansiCyan + "██████╔╝╚██████╔╝╚█████╔╝██║  ██║╚██████╔╝     ██║ ╚████║███████╗██╔╝ ██╗   ██║   " + ansiReset)
	fmt.Println(ansiCyan + "╚═════╝  ╚═════╝  ╚════╝ ╚═╝  ╚═╝ ╚═════╝      ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝   ╚═╝   " + ansiReset)
	fmt.Println(ansiGreen + ansiBold + "Repository" + ansiReset)
	fmt.Println(ansiBlue + "• GitHub:  https://github.com/mzwrt/dujiao-next" + ansiReset)
	fmt.Println(ansiDim + "--------------------------------------------------------------" + ansiReset)
}

func isWeakSecret(secret string) bool {
	if len(secret) < 32 {
		return true
	}
	normalized := strings.ToLower(secret)
	if strings.Contains(normalized, "change-me") ||
		strings.Contains(normalized, "change-in-production") ||
		strings.Contains(normalized, "your-secret-key") {
		return true
	}
	return false
}

// resolveDefaultAdminCredentials 解析默认管理员初始化凭据（环境变量优先，其次 config.yml）
func resolveDefaultAdminCredentials(cfg *config.Config) (string, string) {
	user := strings.TrimSpace(os.Getenv("DJ_DEFAULT_ADMIN_USERNAME"))
	pass := strings.TrimSpace(os.Getenv("DJ_DEFAULT_ADMIN_PASSWORD"))
	if cfg == nil {
		return user, pass
	}
	if user == "" {
		user = strings.TrimSpace(cfg.Bootstrap.DefaultAdminUsername)
	}
	if pass == "" {
		pass = strings.TrimSpace(cfg.Bootstrap.DefaultAdminPassword)
	}
	return user, pass
}
