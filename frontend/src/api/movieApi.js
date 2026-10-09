import { api } from './apiClient';

export const movieApi = {
  /**
   * Fetches all available movies from backend.
   * Backend endpoint: GET /api/movies
   * Returns: ApiResponse<List<MovieResponse>> -> List<MovieResponse>
   */
  getAllMovies: async () => {
    const res = await api.get('/api/movies');
    return res.data;
  },

  /**
   * Fetches a specific movie by its UUID.
   * Backend endpoint: GET /api/movies/{id}
   * Returns: ApiResponse<MovieResponse> -> MovieResponse
   */
  getMovieById: async (id) => {
    const res = await api.get(`/api/movies/${id}`);
    return res.data;
  },
};
