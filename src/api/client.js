import axios from 'axios';

const BASE_URL = 'https://safollo-crm-backend.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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

export const authApi = {
  sendOtp:          (phone) => api.post('/api/auth/send-otp', { phone }),
  verifyOtp:        (phone, code) => api.post('/api/auth/verify-otp', { phone, code }),
  verifyOtpFirst:   (phone, code) => api.post('/api/auth/verify-otp-first', { phone, code }),
  setPassword:      (phone, password) => api.post('/api/auth/set-password', { phone, password }),
  loginWithPassword:(phone, password) => api.post('/api/auth/login', { phone, password }),
  changePassword:   (old_password, new_password) => api.post('/api/auth/change-password', { old_password, new_password }),
  resetPassword:    (userId) => api.post(`/api/auth/reset-password/${userId}`),
  logout:           () => api.post('/api/auth/logout'),
  getMe:            () => api.get('/api/auth/me'),
};

export const usersApi = {
  getAll:       (params) => api.get('/api/users', { params }),
  getById:      (id) => api.get(`/api/users/${id}`),
  create:       (data) => api.post('/api/users', data),
  update:       (id, data) => api.patch(`/api/users/${id}`, data),
  toggleActive: (id) => api.patch(`/api/users/${id}/toggle`),
  getRoles:     () => api.get('/api/users/roles').then(r => Array.isArray(r) ? { data: r } : r),
  createRole:   (data) => api.post('/api/users/roles', data),
  updateRole:   (id, data) => api.patch(`/api/users/roles/${id}`, data),
  deleteRole:   (id) => api.delete(`/api/users/roles/${id}`),
  deleteUser:   (id) => api.delete(`/api/users/${id}`),
};

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

export const coursesApi = {
  getAll:       () => api.get('/api/courses'),
  getById:      (id) => api.get(`/api/courses/${id}`),
  create:       (data) => api.post('/api/courses', data),
  update:       (id, data) => api.patch(`/api/courses/${id}`, data),
  createBatch:  (data) => api.post('/api/courses/batches', data),
  updateBatch:  (id, data) => api.patch(`/api/courses/batches/${id}`, data),
  delete:       (id) => api.delete(`/api/courses/${id}`),
  deleteBatch:  (id) => api.delete(`/api/courses/batches/${id}`),
};

export const salesApi = {
  create:    (formData) => api.post('/api/sales', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll:    (params) => api.get('/api/sales', { params }),
  getById:   (id) => api.get(`/api/sales/${id}`),
  getDueList:(params) => api.get('/api/sales/due', { params }),
  edit:      (id, data) => api.patch(`/api/sales/${id}`, data),
  reassign:  (id, newExecutiveId) => api.patch(`/api/sales/${id}/reassign`, { new_executive_id: newExecutiveId }),
  delete:    (id) => api.delete(`/api/sales/${id}`),
getRevenue: (params) => api.get('/api/sales/revenue', { params }),
};

export const paymentsApi = {
  add:    (formData) => api.post('/api/payments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  cancel: (id) => api.delete(`/api/payments/${id}`),
};

export const reportsApi = {
  daily:         (params) => api.get('/api/reports/daily', { params }),
  monthly:       (params) => api.get('/api/reports/monthly', { params }),
  overview:      () => api.get('/api/reports/overview'),
  myPerformance: (params) => api.get('/api/reports/my-performance', { params }),
};

export const fieldConfigsApi = {
  getAll: () => api.get('/api/field-configs'),
  update: (key, data) => api.patch(`/api/field-configs/${key}`, data),
};

export const auditApi = {
  getLogs: (params) => api.get('/api/audit', { params }),
};

export const approvalsApi = {
  getPending:           () => api.get('/api/approvals'),
  getPendingDue:        () => api.get('/api/approvals/due-payments'),
  getMyPending:         () => api.get('/api/approvals/my-pending'),
  getMyPendingDue:      () => api.get('/api/approvals/my-pending-due'),
  approve:              (id, data) => api.patch(`/api/approvals/${id}/approve`, data),
  reject:               (id, reason) => api.patch(`/api/approvals/${id}/reject`, { reason }),
  resubmit:             (id, data) => api.patch(`/api/approvals/${id}/resubmit`, data),
  approveDuePayment:    (id) => api.patch(`/api/approvals/payments/${id}/approve`),
  rejectDuePayment:     (id, reason) => api.patch(`/api/approvals/payments/${id}/reject`, { reason }),
  resubmitDuePayment:   (id) => api.patch(`/api/approvals/payments/${id}/resubmit`),
};


export const accountingApi = {
  getAccounts: (type) => api.get('/api/accounting/accounts', { params: type ? { type } : {} }),
  getAllAccounts: () => api.get('/api/accounting/accounts/all'),
  createAccount: (data) => api.post('/api/accounting/accounts', data),
  updateAccount: (id, data) => api.patch(`/api/accounting/accounts/${id}`, data),
  getAccountBalance: (id) => api.get(`/api/accounting/accounts/${id}/balance`),
getDashboard: () => api.get('/api/accounting/dashboard'),
getLedger: (id, params) => api.get(`/api/accounting/accounts/${id}/ledger`, { params }),
getSettings: () => api.get('/api/accounting/settings'),
updateSetting: (key, value) => api.patch('/api/accounting/settings', { key, value }),
getSettings: () => api.get('/api/accounting/settings'),
updateSetting: (key, value) => api.patch('/api/accounting/settings', { key, value }),
getTrialBalance: (as_of_date) => api.get('/api/accounting/trial-balance', { params: as_of_date ? { as_of_date } : {} }),
getIncomeStatement: (params) => api.get('/api/accounting/income-statement', { params }),
getBalanceSheet: (as_of_date) => api.get('/api/accounting/balance-sheet', { params: as_of_date ? { as_of_date } : {} }),
getCashFlow: (params) => api.get('/api/accounting/cash-flow', { params }),
getEquityStatement: (params) => api.get('/api/accounting/equity-statement', { params }),
getCreditCards: (params) => api.get('/api/accounting/credit-cards', { params }),
getInvestors: () => api.get('/api/accounting/investors'),
toggleInvestorAccrual: (id, is_accruing) => api.patch(`/api/accounting/investors/${id}/accrual`, { is_accruing }),
getInvestorHistory: (id) => api.get(`/api/accounting/investors/${id}/history`),



  createTransaction: (formData) => api.post('/api/accounting/transactions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getTransactions: (params) => api.get('/api/accounting/transactions', { params }),
  deleteTransaction: (id) => api.delete(`/api/accounting/transactions/${id}`),
updateTransaction: (id, formData) => api.patch(`/api/accounting/transactions/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

};

export const bookApi = {
  confirmDelivery: (enrollment_id, reference_number) => api.post('/api/book/delivered', { enrollment_id, reference_number }),
  markReturned: (enrollment_id, reference_number) => api.post('/api/book/returned', { enrollment_id, reference_number }),
};

export default api;