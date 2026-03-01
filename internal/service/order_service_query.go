package service

import (
	"strings"
	"time"

	"github.com/mzwrt/dujiao-next/internal/constants"
	"github.com/mzwrt/dujiao-next/internal/logger"
	"github.com/mzwrt/dujiao-next/internal/models"
	"github.com/mzwrt/dujiao-next/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

// ensureOrderCanceledIfExpired 读取时懒同步过期订单状态
func (s *OrderService) ensureOrderCanceledIfExpired(order *models.Order) error {
	if order == nil {
		return nil
	}
	if order.Status != constants.OrderStatusPendingPayment {
		return nil
	}
	if order.ExpiresAt == nil {
		return nil
	}
	if order.ExpiresAt.After(time.Now()) {
		return nil
	}
	if err := s.cancelOrderWithChildren(order, true); err != nil {
		return err
	}
	if s.queueClient != nil {
		if _, err := enqueueOrderStatusEmailTaskIfEligible(s.orderRepo, s.queueClient, order.ID, constants.OrderStatusCanceled); err != nil {
			logger.Warnw("order_enqueue_status_email_failed",
				"order_id", order.ID,
				"target_order_id", order.ID,
				"status", constants.OrderStatusCanceled,
				"error", err,
			)
		}
	}
	return nil
}

// ensureOrdersCanceledIfExpired 批量懒同步过期订单状态
func (s *OrderService) ensureOrdersCanceledIfExpired(orders []models.Order) error {
	if len(orders) == 0 {
		return nil
	}
	for i := range orders {
		if err := s.ensureOrderCanceledIfExpired(&orders[i]); err != nil {
			return err
		}
	}
	return nil
}

// GetOrderByUser 获取订单详情
func (s *OrderService) GetOrderByUser(orderID uint, userID uint) (*models.Order, error) {
	order, err := s.orderRepo.GetByIDAndUser(orderID, userID)
	if err != nil {
		return nil, ErrOrderFetchFailed
	}
	if order == nil {
		return nil, ErrOrderNotFound
	}
	if err := s.ensureOrderCanceledIfExpired(order); err != nil {
		return nil, ErrOrderUpdateFailed
	}
	fillOrderItemsFromChildren(order)
	return order, nil
}

// GetOrderByUserOrderNo 按订单号获取用户订单详情
func (s *OrderService) GetOrderByUserOrderNo(orderNo string, userID uint) (*models.Order, error) {
	orderNo = strings.TrimSpace(orderNo)
	if orderNo == "" {
		return nil, ErrOrderNotFound
	}
	order, err := s.orderRepo.GetByOrderNoAndUser(orderNo, userID)
	if err != nil {
		return nil, ErrOrderFetchFailed
	}
	if order == nil {
		return nil, ErrOrderNotFound
	}
	if err := s.ensureOrderCanceledIfExpired(order); err != nil {
		return nil, ErrOrderUpdateFailed
	}
	fillOrderItemsFromChildren(order)
	return order, nil
}

// GetOrderByGuest 获取游客订单详情
func (s *OrderService) GetOrderByGuest(orderID uint, email, password string) (*models.Order, error) {
	order, err := s.orderRepo.GetByIDAndGuest(orderID, email)
	if err != nil {
		return nil, ErrOrderFetchFailed
	}
	if order == nil {
		return nil, ErrGuestOrderNotFound
	}
	// CIS 5.2 / PCI-DSS 6.5.10 — reject over-long passwords before bcrypt to prevent
	// the library's 72-byte truncation from falsely matching a different long password.
	if len(password) > BcryptMaxPasswordBytes {
		return nil, ErrGuestOrderNotFound
	}
	if err := bcrypt.CompareHashAndPassword([]byte(order.GuestPassword), []byte(password)); err != nil {
		return nil, ErrGuestOrderNotFound
	}
	if err := s.ensureOrderCanceledIfExpired(order); err != nil {
		return nil, ErrOrderUpdateFailed
	}
	fillOrderItemsFromChildren(order)
	return order, nil
}

// GetOrderByGuestOrderNo 获取游客订单详情（按订单号）
func (s *OrderService) GetOrderByGuestOrderNo(orderNo, email, password string) (*models.Order, error) {
	order, err := s.orderRepo.GetByOrderNoAndGuest(orderNo, email)
	if err != nil {
		return nil, ErrOrderFetchFailed
	}
	if order == nil {
		return nil, ErrGuestOrderNotFound
	}
	// CIS 5.2 / PCI-DSS 6.5.10 — reject over-long passwords before bcrypt.
	if len(password) > BcryptMaxPasswordBytes {
		return nil, ErrGuestOrderNotFound
	}
	if err := bcrypt.CompareHashAndPassword([]byte(order.GuestPassword), []byte(password)); err != nil {
		return nil, ErrGuestOrderNotFound
	}
	if err := s.ensureOrderCanceledIfExpired(order); err != nil {
		return nil, ErrOrderUpdateFailed
	}
	fillOrderItemsFromChildren(order)
	return order, nil
}

// ListOrdersByUser 获取订单列表
func (s *OrderService) ListOrdersByUser(filter repository.OrderListFilter) ([]models.Order, int64, error) {
	if filter.UserID == 0 {
		return nil, 0, ErrOrderFetchFailed
	}
	orders, total, err := s.orderRepo.ListByUser(filter)
	if err != nil {
		return nil, 0, ErrOrderFetchFailed
	}
	if err := s.ensureOrdersCanceledIfExpired(orders); err != nil {
		return nil, 0, ErrOrderUpdateFailed
	}
	fillOrdersItemsFromChildren(orders)
	return orders, total, nil
}

// ListOrdersByGuest 获取游客订单列表
func (s *OrderService) ListOrdersByGuest(email, password string, page, pageSize int) ([]models.Order, int64, error) {
	// CIS 5.2 / PCI-DSS 6.5.10 — reject over-long passwords before bcrypt.
	// An empty result is indistinguishable from "no orders found", preventing
	// information leakage about the existence of orders for this email.
	if len(password) > BcryptMaxPasswordBytes {
		return nil, 0, nil
	}
	orders, _, err := s.orderRepo.ListByGuest(email, page, pageSize)
	if err != nil {
		return nil, 0, ErrOrderFetchFailed
	}
	filtered := make([]models.Order, 0, len(orders))
	for i := range orders {
		if bcrypt.CompareHashAndPassword([]byte(orders[i].GuestPassword), []byte(password)) == nil {
			filtered = append(filtered, orders[i])
		}
	}
	if err := s.ensureOrdersCanceledIfExpired(filtered); err != nil {
		return nil, 0, ErrOrderUpdateFailed
	}
	fillOrdersItemsFromChildren(filtered)
	return filtered, int64(len(filtered)), nil
}

// ListOrdersForAdmin 管理端订单列表
func (s *OrderService) ListOrdersForAdmin(filter repository.OrderListFilter) ([]models.Order, int64, error) {
	orders, total, err := s.orderRepo.ListAdmin(filter)
	if err != nil {
		return nil, 0, ErrOrderFetchFailed
	}
	if err := s.ensureOrdersCanceledIfExpired(orders); err != nil {
		return nil, 0, ErrOrderUpdateFailed
	}
	fillOrdersItemsFromChildren(orders)
	return orders, total, nil
}

// GetOrderForAdmin 管理端订单详情
func (s *OrderService) GetOrderForAdmin(orderID uint) (*models.Order, error) {
	if orderID == 0 {
		return nil, ErrOrderNotFound
	}
	order, err := s.orderRepo.GetByID(orderID)
	if err != nil {
		return nil, ErrOrderFetchFailed
	}
	if order == nil {
		return nil, ErrOrderNotFound
	}
	if err := s.ensureOrderCanceledIfExpired(order); err != nil {
		return nil, ErrOrderUpdateFailed
	}
	fillOrderItemsFromChildren(order)
	return order, nil
}
