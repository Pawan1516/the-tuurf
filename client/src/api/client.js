import axios from 'axios';
// API configuration
// Priority: REACT_APP_API_URL (CRA) -> NEXT_PUBLIC_API_URL (Next) -> runtime same-origin /api
// Prefer runtime browser origin when available to avoid baking localhost during build
export const API_BASE_URL = (typeof window !== 'undefined')
  ? (window.__THE_TURF_API_URL || `${window.location.origin}/api`)
  : (process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

let accessToken = localStorage.getItem('token');
if (accessToken) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
}

const setAccessToken = (token) => {
  accessToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export { setAccessToken };
export default apiClient;
// Export derived backend origin (without trailing /api) and socket URL helper
export const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api$/i, '');
export const SOCKET_URL = BACKEND_ORIGIN;
// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    config.withCredentials = true; // Crucial for HttpOnly cookies
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Handle Expiry & Auto-Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 & Expiry
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
        .then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        if (data.success && data.token) {
          setAccessToken(data.token);
          localStorage.setItem('token', data.token);
          apiClient.defaults.headers.common.Authorization = `Bearer ${data.token}`;
          processQueue(null, data.token);
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Refresh failed (likely expired/invalid) - Force Logout
        setAccessToken(null);
        localStorage.removeItem('user');
        
        const protectedPaths = ['/dashboard', '/admin', '/worker'];
        const isProtected = protectedPaths.some(p => window.location.pathname.startsWith(p));
        if (isProtected && !window.location.pathname.includes('login')) {
          window.location.href = '/login?expired=true';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  login: (email, password, adminKey = null) => apiClient.post('/auth/login', { email, password, admin_key: adminKey }),
  logout: () => apiClient.post('/auth/logout'),
  logoutAll: () => apiClient.post('/auth/logout-all'),
  sendRegisterOTP: (email) => apiClient.post('/auth/send-register-otp', { email }),
  verifyRegistration: (data) => apiClient.post('/auth/register-verify', data),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  updateFCMToken: (data) => apiClient.post('/auth/update-fcm-token', data),
  quickLogin: (mobile, name) => apiClient.post('/auth/quick-login', { mobile, name }),
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
  delete: (id) => apiClient.delete(`/slots/${id}`),
  getSettings: () => apiClient.get('/slots/settings')
};

// Config APIs
export const configAPI = {
  get: (pageName) => apiClient.get(`/config/${pageName}`),
  update: (pageName, data) => apiClient.post(`/config/${pageName}`, data),
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
  getAllBookings: () => apiClient.get('/admin/bookings'),
  createWorker: (data) => apiClient.post('/admin/workers', data),
  getWorkers: () => apiClient.get('/admin/workers'),
  updateWorker: (id, data) =>
    apiClient.put(`/admin/workers/${id}`, data),
  deleteWorker: (id) => apiClient.delete(`/admin/workers/${id}`),
  getBusiness: () => apiClient.get('/admin/business'),
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
  aiCommand: (message) => apiClient.post('/admin/ai-command', { message }),
  getSettings: () => apiClient.get('/admin/settings'),
  saveSettings: (settings) => apiClient.post('/admin/settings/bulk', { settings }),
  getUsers: () => apiClient.get('/admin/users'),
  getActivityLog: () => apiClient.get('/admin/activity-log'),
};

// Chatbot APIs
export const chatbotAPI = {
  sendMessage: (message, context) => apiClient.post('/chatbot', { message, context })
};

// Matches APIs
export const matchesAPI = {
  getLive: () => apiClient.get(`/matches/live?t=${new Date().getTime()}`),
  getById: (id) => apiClient.get(`/matches/${id}`),
  getMyHistory: () => apiClient.get('/matches/my-history'),
  getAll: (filters) => apiClient.get('/matches', { params: filters }),
  getPlayerProfile: (id) => apiClient.get(`/matches/players/${id}`)
};

// Leaderboard APIs
export const leaderboardAPI = {
  getOverall: () => apiClient.get('/leaderboards/overall'),
  getTopRuns: () => apiClient.get('/leaderboards/runs'),
  getTopWickets: () => apiClient.get('/leaderboards/wickets')
};

// AI APIs
export const aiAPI = {
  recommendSlot: (date, preference) => apiClient.post('/ai/recommend-slot', { date, preference }),
  analyzeRevenue: (analysisType) => apiClient.post('/ai/analyze-revenue', { analysisType }),
  generateNotifications: (context, matchInfo) => apiClient.post('/ai/generate-notifications', { context, matchInfo }),
  broadcastNotification: (title, body) => apiClient.post('/ai/broadcast-notification', { title, body }),
  getExpertHub: () => apiClient.get('/ai/expert-hub'),
  getMasterPrompt: (name) => apiClient.get('/ai/master-prompt', { params: { name } }),
  executeAgent: ({ agentName, promptName, input }) => apiClient.post('/ai/execute-agent', { agentName, promptName, input }),
  getAgentStatus: (jobId) => apiClient.get(`/ai/agent-status/${jobId}`),
};

// Turfs APIs
export const turfsAPI = {
  getAll: (filters) => apiClient.get('/turfs', { params: filters }),
  getById: (id) => apiClient.get(`/turfs/${id}`),
  getPricing: (id, date) => apiClient.get(`/turfs/${id}/pricing`, { params: { date } }),
  addReview: (id, data) => apiClient.post(`/turfs/${id}/review`, data),
  create: (data) => apiClient.post('/turfs', data),
  update: (id, data) => apiClient.put(`/turfs/${id}`, data),
  getAnalysis: (id) => apiClient.get(`/turfs/${id}/analysis`),
};

// Matchmaking APIs
export const matchmakingAPI = {
  findPlayers: (sport, teamSize) => apiClient.post('/matchmaking/find', { sport, teamSize }),
  rebookSameTeam: (matchId) => apiClient.post('/matchmaking/rebook', { matchId }),
  postMatch: (matchId, choice) => apiClient.post('/matchmaking/post-match', { matchId, choice }),
  getAnalytics: () => apiClient.get('/matchmaking/analytics'),
};

// Receipts APIs
export const receiptsAPI = {
    getById: (id) => apiClient.get(`/receipts/${id}`),
    download: (id) => apiClient.get(`/receipts/download/${id}`, { responseType: 'blob' }),
};

// Analytics APIs
export const analyticsAPI = {
    getPlayerStats: (id) => apiClient.get(`/analytics/player/${id}/stats`),
    syncUserStats: (id) => apiClient.post(`/analytics/sync-user-stats/${id}`),
    compare: (p1, p2) => apiClient.get('/analytics/compare', { params: { player1: p1, player2: p2 } })
};




