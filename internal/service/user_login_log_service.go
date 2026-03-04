package service

import (
	"strings"
	"time"
	"unicode/utf8"

	"github.com/mzwrt/dujiao-next/internal/constants"
	"github.com/mzwrt/dujiao-next/internal/models"
	"github.com/mzwrt/dujiao-next/internal/repository"
)

// UserLoginLogService 用户登录日志服务
type UserLoginLogService struct {
	repo repository.UserLoginLogRepository
}

// NewUserLoginLogService 创建用户登录日志服务
func NewUserLoginLogService(repo repository.UserLoginLogRepository) *UserLoginLogService {
	return &UserLoginLogService{repo: repo}
}

// RecordUserLoginInput 登录日志记录输入
type RecordUserLoginInput struct {
	UserID      uint
	Email       string
	Status      string
	FailReason  string
	ClientIP    string
	UserAgent   string
	LoginSource string
	RequestID   string
}

// maxUserAgentBytes is the maximum byte length stored for User-Agent values.
// Limiting to 512 bytes prevents storage-exhaustion DoS while preserving enough
// information for audit purposes (CIS Control 4.1 / PCI-DSS 6.5.10).
const maxUserAgentBytes = 512

// truncateUserAgent trims and truncates a User-Agent string to maxUserAgentBytes,
// ensuring the result is valid UTF-8 by not splitting multi-byte sequences.
func truncateUserAgent(ua string) string {
	ua = strings.TrimSpace(ua)
	if len(ua) <= maxUserAgentBytes {
		return ua
	}
	// Walk backwards from the limit to find a valid UTF-8 rune boundary.
	end := maxUserAgentBytes
	for end > 0 && !utf8.Valid([]byte(ua[:end])) {
		end--
	}
	return ua[:end]
}

// Record 记录登录行为
func (s *UserLoginLogService) Record(input RecordUserLoginInput) error {
	if s == nil || s.repo == nil {
		return nil
	}

	email := strings.TrimSpace(input.Email)
	if normalized, err := NormalizeEmail(email); err == nil {
		email = normalized
	}

	status := strings.ToLower(strings.TrimSpace(input.Status))
	if status != constants.LoginLogStatusSuccess {
		status = constants.LoginLogStatusFailed
	}

	failReason := strings.ToLower(strings.TrimSpace(input.FailReason))
	if status == constants.LoginLogStatusSuccess {
		failReason = ""
	} else if failReason == "" {
		failReason = constants.LoginLogFailReasonInternalError
	}

	source := strings.ToLower(strings.TrimSpace(input.LoginSource))
	if source == "" {
		source = constants.LoginLogSourceWeb
	}

	now := time.Now()
	return s.repo.Create(&models.UserLoginLog{
		UserID:      input.UserID,
		Email:       email,
		Status:      status,
		FailReason:  failReason,
		ClientIP:    strings.TrimSpace(input.ClientIP),
		UserAgent:   truncateUserAgent(input.UserAgent),
		LoginSource: source,
		RequestID:   strings.TrimSpace(input.RequestID),
		CreatedAt:   now,
	})
}

// ListForAdmin 管理端查询登录日志
func (s *UserLoginLogService) ListForAdmin(filter repository.UserLoginLogListFilter) ([]models.UserLoginLog, int64, error) {
	if s == nil || s.repo == nil {
		return []models.UserLoginLog{}, 0, nil
	}
	return s.repo.ListAdmin(filter)
}

// ListByUser 用户侧查询自己的登录日志
func (s *UserLoginLogService) ListByUser(userID uint, page, pageSize int) ([]models.UserLoginLog, int64, error) {
	if s == nil || s.repo == nil || userID == 0 {
		return []models.UserLoginLog{}, 0, nil
	}
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return s.repo.ListByUser(userID, page, pageSize)
}
