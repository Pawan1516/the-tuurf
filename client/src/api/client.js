import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (email, password, role) =>
    apiClient.post('/auth/login', { email, password, role }),
  register: (name, email, phone, password) =>
    apiClient.post('/auth/register', { name, email, phone, password })
};

// Slots APIs
export const slotsAPI = {
  getAll: (date) => apiClient.get('/slots', { params: { date } }),
  getById: (id) => apiClient.get(`/slots/${id}`),
  create: (data) => apiClient.post('/slots', data),
  updateStatus: (id, status) =>
    apiClient.put(`/slots/${id}/status`, { status }),
  assignWorker: (id, workerId) =>
    apiClient.put(`/slots/${id}/assign`, { workerId }),
  delete: (id) => apiClient.delete(`/slots/${id}`)
};

// Bookings APIs
export const bookingsAPI = {
  create: (data) => apiClient.post('/bookings', data),
  getAll: (filters) => apiClient.get('/bookings', { params: filters }),
  getMyBookings: () => apiClient.get('/bookings/my-bookings'),
  getMySlots: () => apiClient.get('/bookings/my-slots'),
  getById: (id) => apiClient.get(`/bookings/${id}`),
  updateStatus: (id, status) =>
    apiClient.put(`/bookings/${id}/status`, { status }),
  updateUsername: (id, userName) =>
    apiClient.put(`/bookings/${id}/username`, { userName }),
  verifyPayment: (id, paymentStatus, paymentId) =>
    apiClient.put(`/bookings/${id}/payment`, { paymentStatus, paymentId }),
  submitPayment: (id, transactionId) =>
    apiClient.put(`/bookings/${id}/submit-payment`, { transactionId }),
  downloadReport: () =>
    apiClient.get('/bookings/report/download', { responseType: 'blob' }),
  downloadPDFReport: () =>
    apiClient.get('/bookings/report/pdf', { responseType: 'blob' }),
  resendNotification: (id) =>
    apiClient.post(`/bookings/${id}/notify`),
  getAIInsights: (id) => apiClient.get(`/bookings/${id}/ai-insights`)
};

// Payments APIs
export const paymentsAPI = {
  createOrder: (amount, bookingId) =>
    apiClient.post('/payments/create-order', { amount, bookingId }),
  verify: (paymentData) =>
    apiClient.post('/payments/verify', paymentData)
};

// Admin APIs
export const adminAPI = {
  createWorker: (data) => apiClient.post('/admin/workers', data),
  getWorkers: () => apiClient.get('/admin/workers'),
  updateWorker: (id, data) =>
    apiClient.put(`/admin/workers/${id}`, data),
  deleteWorker: (id) => apiClient.delete(`/admin/workers/${id}`),
  getRevenue: (period) =>
    apiClient.get('/admin/revenue', { params: { period } }),
  downloadPDFReport: (filters) =>
    apiClient.get('/admin/report/pdf', {
      params: filters,
      responseType: 'blob'
    }),
  downloadReport: (filters) =>
    apiClient.get('/admin/report/csv', {
      params: filters,
      responseType: 'blob'
    }),
  sendMessage: (phone, message, bookingId) =>
    apiClient.post('/admin/message', { phone, message, bookingId }),
  manualBooking: (data) =>
    apiClient.post('/admin/bookings/manual', data),
  getSystemStatus: () => apiClient.get('/admin/system/status'),
  syncSlots: () => apiClient.post('/admin/system/sync-slots'),
  aiCommand: (message) => apiClient.post('/admin/ai-command', { message })
};

// Chatbot APIs
export const chatbotAPI = {
  sendMessage: (message, context) => apiClient.post('/chatbot', { message, context })
};

export default apiClient;

