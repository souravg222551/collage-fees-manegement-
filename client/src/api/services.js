import api from './client';

// Downloads a file through an authenticated axios request (so the Bearer
// token is attached) instead of a plain <a href> link, which depends on
// the httpOnly cookie and can be silently blocked by browsers with strict
// cross-site cookie policies (Brave, Safari ITP, etc.).
const downloadFile = async (url, params, fallbackName) => {
  const response = await api.get(url, { params, responseType: 'blob' });

  const disposition = response.headers['content-disposition'];
  const match = disposition && disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackName;

  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

// Opens a file in a new tab via an authenticated request (for PDFs meant
// to be viewed inline, e.g. receipts) instead of a raw link.
const openFile = async (url, params) => {
  const response = await api.get(url, { params, responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(response.data);
  window.open(blobUrl, '_blank');
  // Revoke after a delay so the new tab has time to load it
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
};

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
  collectBulk: (data) => api.post('/fees/bulk', data),
  update: (id, data) => api.put(`/fees/${id}`, data),
  remove: (id) => api.delete(`/fees/${id}`),
};

// ---- Receipts ----
export const receiptApi = {
  list: (params) => api.get('/receipts', { params }),
  get: (id) => api.get(`/receipts/${id}`),
  viewPdf: (id) => openFile(`/receipts/${id}/pdf`),
  downloadPdf: (id, receiptNumber) => downloadFile(`/receipts/${id}/pdf`, {}, `${receiptNumber || 'receipt'}.pdf`),
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
  downloadCsv: (params) => downloadFile('/reports/export/csv', params, `${params.type || 'report'}-report.csv`),
  downloadPdf: (params) => downloadFile('/reports/export/pdf', params, `${params.type || 'report'}-report.pdf`),
};

// ---- Admin Management (Super Admin only) ----
export const adminApi = {
  list: () => api.get('/admins'),
  create: (data) => api.post('/admins', data),
  setStatus: (id, isActive) => api.put(`/admins/${id}/status`, { isActive }),
  remove: (id) => api.delete(`/admins/${id}`),
};

// ---- Fee Structure (class-level fee categories, per Class/Course+Semester group) ----
export const feeStructureApi = {
  groups: () => api.get('/fee-structure/groups'),
  get: (academicSession, groupLabel) => api.get('/fee-structure', { params: { academicSession, groupLabel } }),
  addItem: (data) => api.post('/fee-structure', data),
  updateItem: (id, data) => api.put(`/fee-structure/${id}`, data),
  removeItem: (id) => api.delete(`/fee-structure/${id}`),
  studentSummary: (studentId) => api.get(`/fee-structure/summary/${studentId}`),
  syncCharges: () => api.post('/fee-structure/sync-charges'),
};

// ---- Per-student optional/custom fee add-ons (e.g. Transport, Hostel) ----
export const studentFeeItemApi = {
  catalog: (studentId) => api.get(`/students/${studentId}/fee-items/catalog`),
  list: (studentId) => api.get(`/students/${studentId}/fee-items`),
  add: (studentId, data) => api.post(`/students/${studentId}/fee-items`, data),
  remove: (studentId, itemId) => api.delete(`/students/${studentId}/fee-items/${itemId}`),
};

// ---- Settings ----
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (formData) =>
    api.put('/settings', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

