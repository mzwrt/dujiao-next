package models

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"strings"

	"github.com/mzwrt/dujiao-next/internal/logger"

	"golang.org/x/crypto/bcrypt"
)

// InitDefaultAdmin 初始化默认管理员账号
func InitDefaultAdmin(username, password string) error {
	var count int64
	if err := DB.Model(&Admin{}).Count(&count).Error; err != nil {
		return fmt.Errorf("count admins failed: %w", err)
	}

	// 如果已有管理员，确保默认 admin 拥有超级管理员权限
	if count > 0 {
		if err := DB.Model(&Admin{}).Where("username = ?", "admin").Update("is_super", true).Error; err != nil {
			logger.Warnw("ensure_default_admin_super_failed", "error", err)
		}
		// 注意：不对 bootstrap 配置中的自定义用户名做自动提权。
		// 每次重启时从配置文件自动将任意用户名提升为超管，会让拥有配置文件写权限的人
		// 绕过数据库 RBAC 控制实施权限提升攻击，或使已被降权的账号在重启后恢复超管权限。
		// Security: do NOT auto-promote the configured bootstrap username to super admin
		// on every restart. Doing so would allow anyone with config file write access to
		// escalate any account to super admin, bypassing the database RBAC controls, and
		// would silently undo intentional demotions after a server restart.
		return nil
	}

	// 创建默认管理员
	if username == "" {
		username = "admin"
	}
	generated := false
	if password == "" {
		var err error
		password, err = generateRandomPassword(24)
		if err != nil {
			return fmt.Errorf("generate random password failed: %w", err)
		}
		generated = true
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	admin := Admin{
		Username:     username,
		PasswordHash: string(hash),
		IsSuper:      true, // 首次引导创建的管理员始终是超级管理员
	}

	if err := DB.Create(&admin).Error; err != nil {
		return err
	}

	if generated {
		printGeneratedCredentials(username, password)
		logger.Warnw("default_admin_created_with_random_password", "username", username)
		logger.Warnw("default_admin_password_change_required", "username", username)
	} else {
		logger.Warnw("default_admin_created", "username", username, "password_hidden", true)
	}

	return nil
}

// printGeneratedCredentials 将生成的凭据输出到 stderr，确保用户在终端和 docker logs 中都能看到。
// PCI-DSS 8.2.1 — 仅显示密码前 4 位，提示用户查看完整密码的安全方式已不适用；
// 出于首次部署可用性，完整密码仅在此处打印一次，日志中不再记录。
func printGeneratedCredentials(username, password string) {
	masked := strings.Repeat("*", len(password))
	if len(password) > 4 {
		masked = password[:4] + strings.Repeat("*", len(password)-4)
	}
	const banner = `
╔══════════════════════════════════════════════════════════════╗
║           ⚠️  默认管理员账号已自动创建                        ║
║           ⚠️  Default admin account created                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║   用户名 / Username : %-36s  ║
║   密  码 / Password : %-36s  ║
║                                                              ║
║   ⚠️  请立即登录后台修改此密码！                              ║
║   ⚠️  Please change this password immediately!               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`
	fmt.Fprintf(os.Stderr, banner, username, masked)
}

func generateRandomPassword(length int) (string, error) {
	buf := make([]byte, length)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf)[:length], nil
}
