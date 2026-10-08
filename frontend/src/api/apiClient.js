const TOKEN_KEY = 'cinebook_jwt_token';
const USER_KEY = 'cinebook_user';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const removeStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let onUnauthorizedCallback = null;
export const setOnUnauthorizedCallback = (callback) => {
  onUnauthorizedCallback = callback;
};

export async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Use relative URL so Vite proxy forwards /api to backend
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkErr) {
    throw new ApiError('Network error: Unable to reach backend server', 0);
  }

  let body = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      removeStoredToken();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }

    let errorMsg = 'An error occurred';
    if (body) {
      if (typeof body.message === 'string') {
        errorMsg = body.message;
      } else if (body.data && typeof body.data === 'object') {
        // e.g. Validation errors map { field: error }
        const fieldErrors = Object.values(body.data).join(', ');
        errorMsg = `${body.message}: ${fieldErrors}`;
      }
    } else {
      errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    }

    throw new ApiError(errorMsg, response.status, body ? body.data : null);
  }

  return body;
}

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: (endpoint, body, options) =>
    request(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
};
