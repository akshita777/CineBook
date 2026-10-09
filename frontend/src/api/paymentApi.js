import { api } from './apiClient';

export const paymentApi = {
  /**
   * Processes mock payment for a pending booking.
   * Backend endpoint: POST /api/payments/process
   * Request: { bookingId, amount, paymentMethod, simulateStatus }
   * Returns: ApiResponse<PaymentResponse> -> PaymentResponse
   */
  processPayment: async ({ bookingId, amount, paymentMethod = 'CREDIT_CARD', simulateStatus = 'SUCCESS' }) => {
    const res = await api.post('/api/payments/process', {
      bookingId,
      amount,
      paymentMethod,
      simulateStatus,
    });
    return res.data;
  },
};
