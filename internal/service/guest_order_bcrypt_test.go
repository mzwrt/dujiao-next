package service

import (
	"errors"
	"strings"
	"testing"

	"github.com/mzwrt/dujiao-next/internal/models"
	"github.com/mzwrt/dujiao-next/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

// guestOrderRepoStub embeds repository.OrderRepository so it satisfies the
// interface while only overriding the guest-lookup methods needed by the tests.
type guestOrderRepoStub struct {
	repository.OrderRepository
	byID     *models.Order
	byIDErr  error
	byNo     *models.Order
	byNoErr  error
}

func (s *guestOrderRepoStub) GetByIDAndGuest(_ uint, _ string) (*models.Order, error) {
	return s.byID, s.byIDErr
}
func (s *guestOrderRepoStub) GetByOrderNoAndGuest(_, _ string) (*models.Order, error) {
	return s.byNo, s.byNoErr
}

// buildPasswordHash creates a bcrypt hash at minimum cost for test speed.
func buildPasswordHash(t *testing.T, password string) string {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("bcrypt hash: %v", err)
	}
	return string(hash)
}

// longPass returns a string of n repeated 'a' bytes.
func longPass(n int) string { return strings.Repeat("a", n) }

// ---------------------------------------------------------------------------
// CreateGuestOrder — password length guard
// ---------------------------------------------------------------------------

// TestCreateGuestOrder_PasswordTooLong verifies that CreateGuestOrder returns
// ErrWeakPassword (not a bcrypt panic/error) when the order password exceeds
// BcryptMaxPasswordBytes (72 bytes).
// CIS 5.2 / PCI-DSS 6.5.10.
func TestCreateGuestOrder_PasswordTooLong(t *testing.T) {
	svc := &OrderService{}
	_, err := svc.CreateGuestOrder(CreateGuestOrderInput{
		Email:         "guest@example.com",
		OrderPassword: longPass(BcryptMaxPasswordBytes + 1),
	})
	if !errors.Is(err, ErrWeakPassword) {
		t.Errorf("expected ErrWeakPassword, got %v", err)
	}
}

// TestCreateGuestOrder_PasswordExactlyAtLimit verifies that a password at
// exactly BcryptMaxPasswordBytes is accepted by the length guard and proceeds
// to later validation (empty items → ErrInvalidOrderItem).
func TestCreateGuestOrder_PasswordExactlyAtLimit(t *testing.T) {
	svc := &OrderService{}
	_, err := svc.CreateGuestOrder(CreateGuestOrderInput{
		Email:         "guest@example.com",
		OrderPassword: longPass(BcryptMaxPasswordBytes),
	})
	// Password guard must NOT fire; failure must come from order items, not password.
	if errors.Is(err, ErrWeakPassword) {
		t.Errorf("password of exactly %d bytes should not trigger ErrWeakPassword", BcryptMaxPasswordBytes)
	}
}

// ---------------------------------------------------------------------------
// GetOrderByGuest — over-long password rejection
// ---------------------------------------------------------------------------

// TestGetOrderByGuest_OverLongPasswordRejected ensures that an over-long input
// password is rejected without calling bcrypt, preventing the 72-byte truncation
// from allowing "AAAA…(72)" to match "AAAA…(72)extraSuffix".
func TestGetOrderByGuest_OverLongPasswordRejected(t *testing.T) {
	validPass := longPass(BcryptMaxPasswordBytes)
	order := &models.Order{GuestPassword: buildPasswordHash(t, validPass)}
	stub := &guestOrderRepoStub{byID: order}
	svc := &OrderService{orderRepo: stub}

	// An attacker who knows the first 72 bytes appends extra bytes.
	attackerPass := validPass + "extra"
	_, err := svc.GetOrderByGuest(1, "guest@example.com", attackerPass)
	if !errors.Is(err, ErrGuestOrderNotFound) {
		t.Errorf("expected ErrGuestOrderNotFound for over-long password, got %v", err)
	}
}

// ---------------------------------------------------------------------------
// GetOrderByGuestOrderNo — over-long password rejection
// ---------------------------------------------------------------------------

func TestGetOrderByGuestOrderNo_OverLongPasswordRejected(t *testing.T) {
	validPass := longPass(BcryptMaxPasswordBytes)
	order := &models.Order{GuestPassword: buildPasswordHash(t, validPass)}
	stub := &guestOrderRepoStub{byNo: order}
	svc := &OrderService{orderRepo: stub}

	_, err := svc.GetOrderByGuestOrderNo("ORDER-001", "guest@example.com", validPass+"x")
	if !errors.Is(err, ErrGuestOrderNotFound) {
		t.Errorf("expected ErrGuestOrderNotFound for over-long password, got %v", err)
	}
}

// ---------------------------------------------------------------------------
// ListOrdersByGuest — over-long password returns empty list (no info leak)
// ---------------------------------------------------------------------------

func TestListOrdersByGuest_OverLongPasswordReturnsEmpty(t *testing.T) {
	svc := &OrderService{} // no repo needed — guard fires before DB access
	orders, count, err := svc.ListOrdersByGuest(
		"guest@example.com",
		longPass(BcryptMaxPasswordBytes+1),
		1, 20,
	)
	if err != nil {
		t.Fatalf("expected nil error for over-long password, got: %v", err)
	}
	if len(orders) != 0 || count != 0 {
		t.Errorf("expected empty result, got %d orders (count=%d)", len(orders), count)
	}
}
