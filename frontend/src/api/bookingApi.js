import { api } from './apiClient';

export const bookingApi = {
  /**
   * Submits a booking creation request to the backend.
   * Backend endpoint: POST /api/bookings
   * Request: { userId, showId, showSeatIds, lockToken }
   * Returns: ApiResponse<BookingResponse> -> BookingResponse
   */
  createBooking: async ({ userId, showId, showSeatIds, lockToken }) => {
    const res = await api.post('/api/bookings', {
      userId,
      showId,
      showSeatIds,
      lockToken,
    });
    return res.data;
  },

  /**
   * Fetches an individual booking by ID.
   * Backend endpoint: GET /api/bookings/{id}
   * Returns: ApiResponse<BookingResponse> -> BookingResponse
   */
  getBookingById: async (id) => {
    const res = await api.get(`/api/bookings/${id}`);
    return res.data;
  },

  /**
   * Fetches all bookings belonging to the authenticated user.
   * Backend endpoint: GET /api/bookings/my-bookings
   * Returns: ApiResponse<List<BookingResponse>> -> List<BookingResponse>
   */
  getMyBookings: async () => {
    const res = await api.get('/api/bookings/my-bookings');
    return res.data;
  },

  /**
   * Cancels a confirmed booking and releases seats back to AVAILABLE.
   * Backend endpoint: POST /api/bookings/{id}/cancel
   * Returns: ApiResponse<BookingResponse> -> BookingResponse
   */
  cancelBooking: async (id) => {
    const res = await api.post(`/api/bookings/${id}/cancel`);
    return res.data;
  },
};
