import axios from 'axios';

// Create API instance pointing to backend routes
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Allow cookies to pass across domains
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token dynamically to outgoing requests if saved in local storage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept expired or invalid session errors (401 / 403) to clear local state
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    
    if (status === 401) {
      // Clear token and user session data on unauthorized requests
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Auto redirect to login path if not currently inside login/register paths
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
