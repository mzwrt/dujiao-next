package models

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"

	"github.com/mzwrt/dujiao-next/internal/logger"

	"golang.org/x/crypto/bcrypt"
)

// InitDefaultAdmin 初始化默认管理员账号
func InitDefaultAdmin(username, password string) error {
	var count int64
	if err := DB.Model(&Admin{}).Count(&count).Error; err != nil {
		return fmt.Errorf("count admins failed: %w", err)
	}

	// 已有管理员时直接跳过，不做任何自动提权。
	// Security: auto-promoting any account (even the literal "admin" username) to
	// is_super=true on every restart creates a privilege-escalation path: an
	// intentional demotion performed through the admin interface is silently undone
	// after the next restart. Super-admin status must only be set via the admin UI.
	if count > 0 {
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
// 完整密码仅此处打印一次，不记录到结构化日志文件中（避免日志归档后凭据泄露）。
// 部署者应在首次登录后立即修改密码。
func printGeneratedCredentials(username, password string) {
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
	fmt.Fprintf(os.Stderr, banner, username, password)
}

func generateRandomPassword(length int) (string, error) {
	buf := make([]byte, length)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf)[:length], nil
}
