import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const storage = localStorage.getItem('saidbaraka-auth-storage');
  if (storage) {
    try {
      const parsed = JSON.parse(storage);
      const token = parsed?.state?.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

client.interceptors.response.use(
  (response) => {
    // Unwrap { success, data } wrapper from backend ResponseTransformInterceptor
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const storage = localStorage.getItem('saidbaraka-auth-storage');
      if (storage) {
        try {
          const parsed = JSON.parse(storage);
          parsed.state = {
            accessToken: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
          };
          localStorage.setItem('saidbaraka-auth-storage', JSON.stringify(parsed));
        } catch {
          localStorage.removeItem('saidbaraka-auth-storage');
        }
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default client;
