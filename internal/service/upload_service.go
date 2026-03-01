package service

import (
	"encoding/binary"
	"fmt"
	"image"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/mzwrt/dujiao-next/internal/config"

	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	"github.com/google/uuid"
)

var allowedUploadScenes = map[string]struct{}{
	"product":  {},
	"post":     {},
	"banner":   {},
	"editor":   {},
	"common":   {},
	"category": {},
}

// defaultAllowedExtensions — CIS 5.2 / PCI-DSS 6.5.8: when no allow-list is
// configured, only known-safe image extensions are accepted to prevent stored
// XSS via HTML/SVG uploads.
var defaultAllowedExtensions = []string{".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".ico"}

// defaultAllowedTypes mirrors the extension defaults at the MIME level.
var defaultAllowedTypes = []string{
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/bmp",
	"image/x-icon",
}

// UploadService 文件上传服务
type UploadService struct {
	cfg *config.Config
}

// NewUploadService 创建文件上传服务实例
func NewUploadService(cfg *config.Config) *UploadService {
	return &UploadService{cfg: cfg}
}

// SaveFile 保存上传的文件
func (s *UploadService) SaveFile(file *multipart.FileHeader, scene string) (string, error) {
	// 验证文件大小
	if file.Size > s.cfg.Upload.MaxSize {
		return "", fmt.Errorf("文件大小超过限制（最大 %d MB）", s.cfg.Upload.MaxSize/1024/1024)
	}

	// 获取文件扩展名 — 始终执行扩展名白名单校验（CIS 5.2 / PCI-DSS 6.5.8）。
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := s.cfg.Upload.AllowedExtensions
	if len(allowedExts) == 0 {
		allowedExts = defaultAllowedExtensions
	}
	if ext == "" || !isAllowedExtension(ext, allowedExts) {
		return "", fmt.Errorf("文件扩展名不被允许: %s", ext)
	}

	// 验证文件类型
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// 读取文件头部识别 MIME 类型
	buffer := make([]byte, 512)
	_, err = src.Read(buffer)
	if err != nil && err != io.EOF {
		return "", err
	}
	if _, err := src.Seek(0, 0); err != nil { // 重置文件读取位置
		return "", err
	}

	contentType := http.DetectContentType(buffer)
	allowedTypes := s.cfg.Upload.AllowedTypes
	if len(allowedTypes) == 0 {
		allowedTypes = defaultAllowedTypes
	}
	{
		allowed := false
		for _, t := range allowedTypes {
			if strings.EqualFold(contentType, t) {
				allowed = true
				break
			}
		}
		if !allowed {
			return "", fmt.Errorf("文件类型不被允许: %s", contentType)
		}
	}

	if strings.HasPrefix(contentType, "image/") {
		if _, err := src.Seek(0, 0); err != nil {
			return "", err
		}
		width, height, err := decodeImageDimensions(src, contentType)
		if err != nil {
			return "", err
		}
		if s.cfg.Upload.MaxWidth > 0 && width > s.cfg.Upload.MaxWidth {
			return "", fmt.Errorf("图片宽度超过限制（最大 %d）", s.cfg.Upload.MaxWidth)
		}
		if s.cfg.Upload.MaxHeight > 0 && height > s.cfg.Upload.MaxHeight {
			return "", fmt.Errorf("图片高度超过限制（最大 %d）", s.cfg.Upload.MaxHeight)
		}
	}

	if _, err := src.Seek(0, 0); err != nil {
		return "", err
	}

	normalizedScene := normalizeUploadScene(scene)

	// 生成唯一文件名
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	now := time.Now()
	year := now.Format("2006")
	month := now.Format("01")
	savePath := filepath.Join("uploads", normalizedScene, year, month, filename)

	// 确保上传目录存在 (CIS 4.6 — 最小文件权限)
	if err := os.MkdirAll(filepath.Dir(savePath), 0750); err != nil {
		return "", err
	}

	// 保存文件（CIS 4.6 — 显式设置文件权限，不依赖 umask）
	dst, err := os.OpenFile(savePath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0640)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	if err != nil {
		return "", err
	}

	// 返回相对路径，由前端根据环境配置拼接完整 URL
	return fmt.Sprintf("/uploads/%s/%s/%s/%s", normalizedScene, year, month, filename), nil
}

func normalizeUploadScene(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "" {
		return "common"
	}
	if _, ok := allowedUploadScenes[value]; ok {
		return value
	}
	return "common"
}

func isAllowedExtension(ext string, allowed []string) bool {
	for _, allowedExt := range allowed {
		normalized := strings.ToLower(strings.TrimSpace(allowedExt))
		if normalized == "" {
			continue
		}
		if !strings.HasPrefix(normalized, ".") {
			normalized = "." + normalized
		}
		if strings.EqualFold(ext, normalized) {
			return true
		}
	}
	return false
}

func decodeImageDimensions(src io.ReadSeeker, contentType string) (int, int, error) {
	if strings.EqualFold(contentType, "image/webp") {
		width, height, err := decodeWebPDimensions(src)
		if err != nil {
			return 0, 0, fmt.Errorf("无法解析 WebP 图片: %w", err)
		}
		return width, height, nil
	}

	if _, err := src.Seek(0, 0); err != nil {
		return 0, 0, err
	}
	cfg, _, err := image.DecodeConfig(src)
	if err != nil {
		return 0, 0, fmt.Errorf("无法解析图片: %w", err)
	}
	return cfg.Width, cfg.Height, nil
}

func decodeWebPDimensions(src io.ReadSeeker) (int, int, error) {
	if _, err := src.Seek(0, 0); err != nil {
		return 0, 0, err
	}

	header := make([]byte, 12)
	if _, err := io.ReadFull(src, header); err != nil {
		return 0, 0, err
	}
	if string(header[0:4]) != "RIFF" || string(header[8:12]) != "WEBP" {
		return 0, 0, fmt.Errorf("无效的 WebP 文件头")
	}

	// maxWebPChunkSize is the per-chunk size limit. Chunks larger than this are
	// rejected immediately. CIS 5.2 / PCI-DSS 6.5.10 — prevents exhausting memory
	// through a crafted large chunk-size field (DoS). The guard is applied at line 234.
	const maxWebPChunkSize = 100 << 20 // 100 MB

	// dimBuf is a 10-byte stack buffer shared across all dimension chunk reads.
	// VP8X and VP8 need 10 bytes; VP8L needs 5. Using a fixed-size stack array
	// instead of make([]byte, chunkSize) eliminates heap allocations for parsing.
	var dimBuf [10]byte

	for {
		chunkHeader := make([]byte, 8)
		if _, err := io.ReadFull(src, chunkHeader); err != nil {
			return 0, 0, err
		}
		chunkType := string(chunkHeader[0:4])
		chunkSize := int(binary.LittleEndian.Uint32(chunkHeader[4:8]))
		if chunkSize < 0 || chunkSize > maxWebPChunkSize {
			return 0, 0, fmt.Errorf("无效的 WebP chunk")
		}

		switch chunkType {
		case "VP8X":
			if chunkSize < 10 {
				return 0, 0, fmt.Errorf("VP8X chunk 长度不足")
			}
			// 仅读取维度所需的 10 字节，通过 Seek 跳过其余部分，避免堆分配大缓冲区。
			if _, err := io.ReadFull(src, dimBuf[:]); err != nil {
				return 0, 0, err
			}
			if chunkSize > 10 {
				if _, err := src.Seek(int64(chunkSize-10), io.SeekCurrent); err != nil {
					return 0, 0, err
				}
			}
			width := 1 + int(dimBuf[4]) + int(dimBuf[5])<<8 + int(dimBuf[6])<<16
			height := 1 + int(dimBuf[7]) + int(dimBuf[8])<<8 + int(dimBuf[9])<<16
			return width, height, nil

		case "VP8 ":
			if chunkSize < 10 {
				return 0, 0, fmt.Errorf("VP8 chunk 长度不足")
			}
			if _, err := io.ReadFull(src, dimBuf[:]); err != nil {
				return 0, 0, err
			}
			if chunkSize > 10 {
				if _, err := src.Seek(int64(chunkSize-10), io.SeekCurrent); err != nil {
					return 0, 0, err
				}
			}
			width := int(binary.LittleEndian.Uint16(dimBuf[6:8]) & 0x3FFF)
			height := int(binary.LittleEndian.Uint16(dimBuf[8:10]) & 0x3FFF)
			return width, height, nil

		case "VP8L":
			if chunkSize < 5 {
				return 0, 0, fmt.Errorf("VP8L chunk 长度不足")
			}
			// VP8L 仅需前 5 字节（签名 + 维度位流）。
			if _, err := io.ReadFull(src, dimBuf[:5]); err != nil {
				return 0, 0, err
			}
			if chunkSize > 5 {
				if _, err := src.Seek(int64(chunkSize-5), io.SeekCurrent); err != nil {
					return 0, 0, err
				}
			}
			if dimBuf[0] != 0x2f {
				return 0, 0, fmt.Errorf("VP8L 签名无效")
			}
			bits := binary.LittleEndian.Uint32(dimBuf[1:5])
			width := int(bits&0x3FFF) + 1
			height := int((bits>>14)&0x3FFF) + 1
			return width, height, nil

		default:
			// 非维度 chunk — 通过 Seek 跳过，完全不分配内存（CIS 5.2 / PCI-DSS 6.5.10）。
			if _, err := src.Seek(int64(chunkSize), io.SeekCurrent); err != nil {
				return 0, 0, err
			}
		}

		if chunkSize%2 == 1 {
			if _, err := src.Seek(1, io.SeekCurrent); err != nil {
				return 0, 0, err
			}
		}
	}
}
