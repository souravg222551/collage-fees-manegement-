import api from './client';

// ---- Auth ----
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
  updateProfile: (formData) =>
    api.put('/auth/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ---- Students ----
export const studentApi = {
  list: (params) => api.get('/students', { params }),
  get: (id) => api.get(`/students/${id}`),
  create: (formData) =>
    api.post('/students', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) =>
    api.put(`/students/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  remove: (id) => api.delete(`/students/${id}`),
  filters: () => api.get('/students/meta/filters'),
};

// ---- Fees ----
export const feeApi = {
  list: (params) => api.get('/fees', { params }),
  get: (id) => api.get(`/fees/${id}`),
  collect: (data) => api.post('/fees', data),
  update: (id, data) => api.put(`/fees/${id}`, data),
  remove: (id) => api.delete(`/fees/${id}`),
};

// ---- Receipts ----
export const receiptApi = {
  list: (params) => api.get('/receipts', { params }),
  get: (id) => api.get(`/receipts/${id}`),
  pdfUrl: (id) => `${api.defaults.baseURL}/receipts/${id}/pdf`,
};

// ---- Dashboard ----
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  monthlyCollection: () => api.get('/dashboard/monthly-collection'),
  paymentStatus: () => api.get('/dashboard/payment-status'),
  collectionBySemester: () => api.get('/dashboard/collection-by-semester'),
};

// ---- Reports ----
export const reportApi = {
  generate: (params) => api.get('/reports', { params }),
  csvUrl: (params) => `${api.defaults.baseURL}/reports/export/csv?${new URLSearchParams(params)}`,
  pdfUrl: (params) => `${api.defaults.baseURL}/reports/export/pdf?${new URLSearchParams(params)}`,
};

// ---- Settings ----
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (formData) =>
    api.put('/settings', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
