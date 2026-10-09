import { api } from './apiClient';

export const seatApi = {
  /**
   * Fetches the full seat layout and real availability for a show.
   * Backend endpoint: GET /api/shows/{showId}/seats
   * Returns: ApiResponse<ShowSeatMapResponse> -> ShowSeatMapResponse
   */
  getSeatMapForShow: async (showId) => {
    const res = await api.get(`/api/shows/${showId}/seats`);
    return res.data;
  },

  /**
   * Temporarily locks seats in Redis and PostgreSQL.
   * Backend endpoint: POST /api/seat-locks
   * Body: { userId, showId, showSeatIds }
   * Returns: ApiResponse<SeatLockResponse> -> SeatLockResponse
   */
  lockSeats: async ({ userId, showId, showSeatIds }) => {
    const res = await api.post('/api/seat-locks', {
      userId,
      showId,
      showSeatIds,
    });
    return res.data;
  },

  /**
   * Releases previously locked seats before expiration.
   * Backend endpoint: DELETE /api/seat-locks?showId={showId}&seatIds={id}&lockToken={token}
   * Returns: ApiResponse<Void>
   */
  unlockSeats: async ({ showId, seatIds, lockToken }) => {
    const params = new URLSearchParams();
    params.append('showId', showId);
    if (Array.isArray(seatIds)) {
      seatIds.forEach((id) => params.append('seatIds', id));
    }
    params.append('lockToken', lockToken);
    const res = await api.delete(`/api/seat-locks?${params.toString()}`);
    return res.data;
  },
};
