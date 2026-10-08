import { api } from './apiClient';

export const authApi = {
  /**
   * Registers a new user.
   * Backend endpoint: POST /api/auth/register
   * Body: { email, password, fullName, phoneNumber }
   * Returns: ApiResponse<AuthResponse>
   */
  register: async (userData) => {
    const res = await api.post('/api/auth/register', userData);
    return res.data;
  },

  /**
   * Logs in a user.
   * Backend endpoint: POST /api/auth/login
   * Body: { email, password }
   * Returns: ApiResponse<AuthResponse>
   */
  login: async (credentials) => {
    const res = await api.post('/api/auth/login', credentials);
    return res.data;
  },
};
