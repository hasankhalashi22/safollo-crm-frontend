import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://safollo-crm-backend.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Request interceptor — token add
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — 401 handle
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

// Auth
export const authApi = {
  sendOtp:   (phone) => api.post('/api/auth/send-otp', { phone }),
  verifyOtp: (phone, code) => api.post('/api/auth/verify-otp', { phone, code }),
  logout:    () => api.post('/api/auth/logout'),
  getMe:     () => api.get('/api/auth/me'),
};

// Users
export const usersApi = {
  getAll:       (params) => api.get('/api/users', { params }),
  getById:      (id) => api.get(`/api/users/${id}`),
  create:       (data) => api.post('/api/users', data),
  update:       (id, data) => api.patch(`/api/users/${id}`, data),
  toggleActive: (id) => api.patch(`/api/users/${id}/toggle`),
  getRoles:     () => api.get('/api/users/roles'),
};

// Profiles
export const profilesApi = {
  getMe:       () => api.get('/api/profiles/me'),
  updateMe:    (data) => api.patch('/api/profiles/me', data),
  uploadPhoto: (formData) => api.post('/api/profiles/me/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadNid:   (formData) => api.post('/api/profiles/me/nid', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadSignature: (formData) => api.post('/api/profiles/me/signature', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Courses
export const coursesApi = {
  getAll:       () => api.get('/api/courses'),
  getById:      (id) => api.get(`/api/courses/${id}`),
  create:       (data) => api.post('/api/courses', data),
  update:       (id, data) => api.patch(`/api/courses/${id}`, data),
  createBatch:  (data) => api.post('/api/courses/batches', data),
  updateBatch:  (id, data) => api.patch(`/api/courses/batches/${id}`, data),
};

// Sales
export const salesApi = {
  create:    (formData) => api.post('/api/sales', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll:    (params) => api.get('/api/sales', { params }),
  getById:   (id) => api.get(`/api/sales/${id}`),
  getDueList:(params) => api.get('/api/sales/due', { params }),
};

// Payments
export const paymentsApi = {
  add: (formData) => api.post('/api/payments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Reports
export const reportsApi = {
  daily:    (params) => api.get('/api/reports/daily', { params }),
  monthly:  (params) => api.get('/api/reports/monthly', { params }),
  overview: () => api.get('/api/reports/overview'),
};

// Field configs
export const fieldConfigsApi = {
  getAll: () => api.get('/api/field-configs'),
  update: (key, data) => api.patch(`/api/field-configs/${key}`, data),
};

export default api;
