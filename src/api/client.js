import axios from 'axios';

const BASE_URL = 'https://safollo-crm-backend.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
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
  loginWithPassword:(phone, pin) => api.post('/api/auth/login', { phone, pin }),
  changePassword:   (old_pin, new_pin) => api.post('/api/auth/change-pin', { old_pin, new_pin }),
  resetPassword:    (userId) => api.post(`/api/auth/reset-pin/${userId}`),
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
  updateAmount: (id, amount) => api.patch(`/api/payments/${id}/amount`, { amount }),
  updateMethod: (id, payment_method) => api.patch(`/api/payments/${id}/method`, { payment_method }),
  adminDelete: (id) => api.delete(`/api/payments/${id}/admin`),
  updateDetails: (id, data) => api.patch(`/api/payments/${id}/details`, data),
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
  deleteAccount: (id) => api.delete(`/api/accounting/accounts/${id}`),
  setOpeningBalance: (id, amount, usd_amount, date) => api.post(`/api/accounting/accounts/${id}/opening-balance`, { amount, usd_amount, date }),
  setAccruedProfitOverride: (id, amount) => api.post(`/api/accounting/accounts/${id}/accrued-profit-override`, { amount }),
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
analyzeStatement: (formData) => api.post('/api/accounting/card-statements/analyze', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
confirmStatement: (formData) => api.post('/api/accounting/card-statements/confirm', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
distributeProfit: (data) => api.post('/api/accounting/transactions/distribute-profit', data),
getShareholders: () => api.get('/api/accounting/shareholders'),
getJournal: (params) => api.get('/api/accounting/journal', { params }),



  createTransaction: (formData) => api.post('/api/accounting/transactions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getTransactions: (params) => api.get('/api/accounting/transactions', { params: { limit: 10000, ...params } }),
  getReconciliation: (params) => api.get('/api/accounting/reconciliation', { params }),
  backfillPayments: () => api.post('/api/accounting/backfill-payments'),
  deleteTransaction: (id) => api.delete(`/api/accounting/transactions/${id}`),
updateTransaction: (id, formData) => api.patch(`/api/accounting/transactions/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

};

export const bookApi = {
  confirmDelivery: (enrollment_id, reference_number) => api.post('/api/book/delivered', { enrollment_id, reference_number }),
  markReturned: (enrollment_id, reference_number) => api.post('/api/book/returned', { enrollment_id, reference_number }),
};

export const hrApi = {
  getEmployees: () => api.get('/api/hr/employees'),
  getEmployeeHistory: () => api.get('/api/hr/employees/history'),
  getEmployeeById: (id) => api.get(`/api/hr/employees/${id}`),
  getUnlinkedCrmUsers: () => api.get('/api/hr/employees/unlinked-crm-users'),
  createEmployee: (data) => api.post('/api/hr/employees', data),
  updateEmployee: (id, data) => api.patch(`/api/hr/employees/${id}`, data),
  deleteEmployee: (id) => api.delete(`/api/hr/employees/${id}`),
  getPositions: () => api.get('/api/hr/positions'),
  createPosition: (data) => api.post('/api/hr/positions', data),
  updatePosition: (id, data) => api.patch(`/api/hr/positions/${id}`, data),
  deletePosition: (id) => api.delete(`/api/hr/positions/${id}`),
  getOrganogram: () => api.get('/api/hr/organogram'),
  getNotices: () => api.get('/api/hr/notices'),
  createNotice: (formData) => api.post('/api/hr/notices', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteNotice: (id) => api.delete(`/api/hr/notices/${id}`),
uploadEmployeePhoto: (id, formData) => api.post(`/api/hr/employees/${id}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
uploadEmployeeNid: (id, formData) => api.post(`/api/hr/employees/${id}/nid`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
uploadEmployeeSignature: (id, formData) => api.post(`/api/hr/employees/${id}/signature`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
getEmployeeModuleAccess: (id) => api.get(`/api/hr/employees/${id}/module-access`),
setEmployeeModuleAccess: (id, access) => api.put(`/api/hr/employees/${id}/module-access`, { access }),
  syncProfiles: () => api.post('/api/hr/sync-profiles'),
getDashboardStats: () => api.get('/api/hr/dashboard-stats'),
getHolidays: (year) => api.get(`/api/hr/holidays${year ? `?year=${year}` : ''}`),
createHoliday: (data) => api.post('/api/hr/holidays', data),
deleteHoliday: (id) => api.delete(`/api/hr/holidays/${id}`),
linkEssUser: (employeeId, userId) => api.post(`/api/hr/employees/${employeeId}/link-ess`, { user_id: userId }),
unlinkEssUser: (employeeId) => api.delete(`/api/hr/employees/${employeeId}/link-ess`),
createEssLogin: (employeeId) => api.post(`/api/hr/employees/${employeeId}/create-ess-login`),
};

export const leaveApi = {
  getTypes: () => api.get('/api/leave/types'),
  createType: (data) => api.post('/api/leave/types', data),
  updateType: (id, data) => api.patch(`/api/leave/types/${id}`, data),
  deleteType: (id) => api.delete(`/api/leave/types/${id}`),
  getPolicy: () => api.get('/api/leave/policy'),
  updatePolicy: (data) => api.patch('/api/leave/policy', data),
  getMyBalances: (year) => api.get(`/api/leave/my/balances${year ? `?year=${year}` : ''}`),
  getMyApplications: (year) => api.get(`/api/leave/my/applications${year ? `?year=${year}` : ''}`),
  applyLeave: (data) => api.post('/api/leave/my/apply', data),
  getAllApplications: (status) => api.get(`/api/leave/applications${status ? `?status=${status}` : ''}`),
  getEmployeeBalances: (employeeId, year) => api.get(`/api/leave/employees/${employeeId}/balances${year ? `?year=${year}` : ''}`),
  getResidentialLeaveCredits: (employeeId, year) => api.get(`/api/leave/employees/${employeeId}/residential-credits${year ? `?year=${year}` : ''}`),
  processApplication: (id, data) => api.patch(`/api/leave/applications/${id}/process`, data),
getMyApprovalQueue: () => api.get('/api/leave/my/approval-queue'),
getRegister: (year) => api.get(`/api/leave/register${year ? `?year=${year}` : ''}`),
getEmployeeApplications: (employeeId, year) => api.get(`/api/leave/employees/${employeeId}/applications${year ? `?year=${year}` : ''}`),
checkIsApprover: () => api.get('/api/leave/my/is-approver'),
};

export const attendanceApi = {
  getPolicy: () => api.get('/api/attendance/policy'),
  updatePolicy: (data) => api.patch('/api/attendance/policy', data),
  getBreakTypes: () => api.get('/api/attendance/break-types'),
  updateBreakType: (id, data) => api.patch(`/api/attendance/break-types/${id}`, data),
  checkIn: () => api.post('/api/attendance/check-in'),
  breakOut: (breakTypeId) => api.post('/api/attendance/break-out', { break_type_id: breakTypeId }),
  breakIn: (breakId) => api.patch(`/api/attendance/break-in/${breakId}`),
  checkOut: () => api.post('/api/attendance/check-out'),
  getMyToday: () => api.get('/api/attendance/my/today'),
  getMyHistory: (month, year) => api.get(`/api/attendance/my/history?month=${month}&year=${year}`),
  getMySummary: (month, year) => api.get(`/api/attendance/my/summary?month=${month}&year=${year}`),
  requestWaiver: (data) => api.post('/api/attendance/waivers', data),
  getWaivers: (status) => api.get(`/api/attendance/waivers${status ? `?status=${status}` : ''}`),
  decideWaiver: (id, decision) => api.patch(`/api/attendance/waivers/${id}/decide`, { decision }),
  getAll: (params = {}) => {
    const q = new URLSearchParams();
    if (params.date) q.append('date', params.date);
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    if (params.employeeId) q.append('employeeId', params.employeeId);
    if (params.status) q.append('status', params.status);
    return api.get(`/api/attendance/all?${q.toString()}`);
  },
};
export const payrollApi = {
  getEmployeeComponents: (employeeId) => api.get(`/api/payroll/employees/${employeeId}/components`),
  addComponent: (employeeId, data) => api.post(`/api/payroll/employees/${employeeId}/components`, data),
  removeComponent: (id) => api.delete(`/api/payroll/components/${id}`),
  getSettings: () => api.get('/api/payroll/settings'),
  updateSettings: (data) => api.patch('/api/payroll/settings', data),
  prepareMonth: (month, year) => api.post('/api/payroll/prepare', { month, year }),
  updateDraftRun: (id, data) => api.patch(`/api/payroll/runs/${id}`, data),
  finalizeRun: (id) => api.patch(`/api/payroll/runs/${id}/finalize`),
  finalizeAllDrafts: (month, year) => api.post('/api/payroll/finalize-all', { month, year }),
  recordPayment: (id, data) => api.post(`/api/payroll/runs/${id}/payments`, data),
  getPayments: (id) => api.get(`/api/payroll/runs/${id}/payments`),
  closeMonth: (month, year) => api.post('/api/payroll/close', { month, year }),
 getPayrollRuns: (params = {}) => {
    const q = new URLSearchParams();
    if (params.month) q.append('month', params.month);
    if (params.year) q.append('year', params.year);
    if (params.employeeId) q.append('employeeId', params.employeeId);
    if (params.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params.dateTo) q.append('dateTo', params.dateTo);
    return api.get(`/api/payroll/runs?${q.toString()}`);
  },
recalculateRun: (id) => api.patch(`/api/payroll/runs/${id}/recalculate`),
updatePayment: (paymentId, data) => api.patch(`/api/payroll/payments/${paymentId}`, data),
deletePayment: (paymentId) => api.delete(`/api/payroll/payments/${paymentId}`),

};

export const academyApi = {
  // Zoom Accounts
  getZoomAccounts: () => api.get('/api/academy/zoom-accounts'),
  createZoomAccount: (data) => api.post('/api/academy/zoom-accounts', data),
  updateZoomAccount: (id, data) => api.put(`/api/academy/zoom-accounts/${id}`, data),
  deleteZoomAccount: (id) => api.delete(`/api/academy/zoom-accounts/${id}`),

  // Payment Rates
  getPaymentRates: () => api.get('/api/academy/payment-rates'),
  upsertPaymentRate: (data) => api.post('/api/academy/payment-rates', data),
  deletePaymentRate: (id) => api.delete(`/api/academy/payment-rates/${id}`),
  deleteCourseTypeRates: (courseType) => api.delete(`/api/academy/payment-rates/course/${encodeURIComponent(courseType)}`),

  // Teachers
  getTeachers: () => api.get('/api/academy/teachers'),
  getTeacher: (id) => api.get(`/api/academy/teachers/${id}`),
  createTeacher: (data) => api.post('/api/academy/teachers', data),
  updateTeacher: (id, data) => api.put(`/api/academy/teachers/${id}`, data),
  deleteTeacher: (id) => api.delete(`/api/academy/teachers/${id}`),
  getPendingTeachers: () => api.get('/api/teacher/pending'),
  approveTeacher: (id, approved) => api.post(`/api/teacher/${id}/approve`, { approved }),
  resetTeacherPassword: (id, password) => api.post(`/api/teacher/${id}/reset-password`, { password }),

  // Courses
  getCourses: () => api.get('/api/academy/courses'),
  createCourse: (data) => api.post('/api/academy/courses', data),
  updateCourse: (id, data) => api.put(`/api/academy/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/api/academy/courses/${id}`),

  // Course Plans
  getCoursePlans: (courseId) => api.get(`/api/academy/courses/${courseId}/plans`),
  createPlan: (courseId, data) => api.post(`/api/academy/courses/${courseId}/plans`, data),
  updatePlan: (id, data) => api.put(`/api/academy/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/api/academy/plans/${id}`),

  // Plan Subjects
  getPlanSubjects: (planId) => api.get(`/api/academy/plans/${planId}/subjects`),
  createSubject: (planId, data) => api.post(`/api/academy/plans/${planId}/subjects`, data),
  updateSubject: (id, data) => api.put(`/api/academy/subjects/${id}`, data),
  deleteSubject: (id) => api.delete(`/api/academy/subjects/${id}`),
  saveLectures: (subjectId, lectures) => api.put(`/api/academy/subjects/${subjectId}/lectures`, { lectures }),

  // Batches
  getBatches: () => api.get('/api/academy/batches'),
  createBatch: (data) => api.post('/api/academy/batches', data),
  updateBatch: (id, data) => api.put(`/api/academy/batches/${id}`, data),
  deleteBatch: (id) => api.delete(`/api/academy/batches/${id}`),

  // Batch Outline
  getBatchOutline: (batchId) => api.get(`/api/academy/batches/${batchId}/outline`),
  addOutlineRow: (batchId, data) => api.post(`/api/academy/batches/${batchId}/outline`, data),
  bulkAddOutlineRows: (batchId, rows) => api.post(`/api/academy/batches/${batchId}/outline/bulk`, { rows }),
  updateOutlineRow: (id, data) => api.put(`/api/academy/outline/${id}`, data),
  deleteOutlineRow: (id) => api.delete(`/api/academy/outline/${id}`),

  // Feedback
  submitFeedback: (outlineId, teacher_id, note) => api.post(`/api/academy/outline/${outlineId}/feedback`, { teacher_id, note }),
  getPendingFeedbacks: () => api.get('/api/academy/feedbacks/pending'),
  approveFeedback: (id, approved) => api.post(`/api/academy/feedbacks/${id}/approve`, { approved }),

  // Teacher Payments
  getTeacherPayments: (teacherId) => api.get(`/api/academy/teacher-payments${teacherId ? `?teacher_id=${teacherId}` : ''}`),
  payTeacher: (data) => api.post('/api/academy/teacher-payments/pay', data),
  recalculatePayments: () => api.post('/api/academy/teacher-payments/recalculate'),

  // Reports
  getScheduleReport: (params) => api.get('/api/academy/reports/schedule', { params }),

  // Excel Import
  importPlanExcel: (planId, file) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post(`/api/academy/plans/${planId}/import-excel`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  importSubjectExcel: (subjectId, file) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post(`/api/academy/subjects/${subjectId}/import-excel`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export default api;