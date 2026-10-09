import { api } from './apiClient';

export const showApi = {
  /**
   * Fetches all shows for a given movie UUID.
   * Backend endpoint: GET /api/shows/movie/{movieId}
   * Returns: ApiResponse<List<ShowResponse>> -> List<ShowResponse>
   */
  getShowsByMovie: async (movieId) => {
    const res = await api.get(`/api/shows/movie/${movieId}`);
    return res.data;
  },

  /**
   * Fetches a single show by UUID.
   * Backend endpoint: GET /api/shows/{id}
   * Returns: ApiResponse<ShowResponse> -> ShowResponse
   */
  getShowById: async (id) => {
    const res = await api.get(`/api/shows/${id}`);
    return res.data;
  },
};
