import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create a simple event emitter for data refresh
const eventListeners = {};

export const onDataChange = (eventName, callback) => {
    if (!eventListeners[eventName]) {
        eventListeners[eventName] = [];
    }
    eventListeners[eventName].push(callback);
};

export const emitDataChange = (eventName, data) => {
    if (eventListeners[eventName]) {
        eventListeners[eventName].forEach(callback => callback(data));
    }
};

export const removeDataChangeListener = (eventName, callback) => {
    if (eventListeners[eventName]) {
        const index = eventListeners[eventName].indexOf(callback);
        if (index > -1) {
            eventListeners[eventName].splice(index, 1);
        }
    }
};

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
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

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    getProfile: () => api.get('/auth/profile'),
    logout: () => api.post('/auth/logout'),
    register: (data) => api.post('/auth/register', data),
    refreshToken: () => api.post('/auth/refresh'),
};

// Customer API (with event emission)
export const customerAPI = {
    getAll: () => api.get('/customers'),
    getById: (id) => api.get(`/customers/${id}`),
    getByNIC: (nic) => api.get(`/customers/nic/${nic}`),
    create: async (data) => {
        const response = await api.post('/customers', data);
        emitDataChange('customers', { action: 'created', data: response.data });
        return response;
    },
    update: async (id, data) => {
        const response = await api.put(`/customers/${id}`, data);
        emitDataChange('customers', { action: 'updated', data: response.data });
        return response;
    },
    delete: async (id) => {
        const response = await api.delete(`/customers/${id}`);
        emitDataChange('customers', { action: 'deleted', id });
        return response;
    },
}

// Account API (with event emission)
export const accountAPI = {
    getAll: () => api.get('/accounts'),
    getById: (id) => api.get(`/accounts/${id}`),
    getByCustomerId: (customerId) => api.get(`/accounts/customer/${customerId}`),
    getBalance: (id) => api.get(`/accounts/${id}/balance`),
    getSummary: (id) => api.get(`/accounts/${id}/summary`),
    create: async (data) => {
        const response = await api.post('/accounts', data);
        emitDataChange('accounts', { action: 'created', data: response.data });
        return response;
    },
    updateStatus: async (id, status) => {
        const response = await api.patch(`/accounts/${id}/status`, { status });
        emitDataChange('accounts', { action: 'updated', id, status });
        return response;
    },
    addJointHolder: (id, customerId) => api.post(`/accounts/${id}/joint`, { customer_id: customerId }),
    update: async (id, data) => {
        const response = await api.put(`/accounts/${id}`, data);
        emitDataChange('accounts', { action: 'updated', data: response.data });
        return response;
    },
    delete: async (id) => {
        const response = await api.delete(`/accounts/${id}`);
        emitDataChange('accounts', { action: 'deleted', id });
        return response;
    },
};

// Transaction API (with event emission)
export const transactionAPI = {
    getAll: () => api.get('/transactions'),
    getById: (id) => api.get(`/transactions/${id}`),
    getByAccountId: (accountId) => api.get(`/transactions/account/${accountId}`),
    create: async (data) => {
        const response = await api.post('/transactions', data);
        emitDataChange('transactions', { action: 'created', data: response.data });
        return response;
    },
    deposit: async (data) => {
        const response = await api.post('/transactions/deposit', data);
        emitDataChange('transactions', { action: 'deposit', data: response.data });
        return response;
    },
    withdraw: async (data) => {
        const response = await api.post('/transactions/withdraw', data);
        emitDataChange('transactions', { action: 'withdraw', data: response.data });
        return response;
    },
    transfer: async (data) => {
        const response = await api.post('/transactions/transfer', data);
        emitDataChange('transactions', { action: 'transfer', data: response.data });
        return response;
    },
    getAccountTransactions: (accountId, limit = 50, offset = 0) => 
        api.get(`/transactions/account/${accountId}?limit=${limit}&offset=${offset}`),
    getTransactionById: (id) => api.get(`/transactions/${id}`),
    getAccountSummary: (accountId) => api.get(`/transactions/account/${accountId}/summary`),
    getDailyReport: (date) => api.get(`/transactions/reports/daily?date=${date}`),
    getMonthlyReport: (year, month) => api.get(`/transactions/reports/monthly?year=${year}&month=${month}`),
};

// Fixed Deposit API (with event emission)
export const fdAPI = {
    getPlans: () => api.get('/fd/plans'),
    getPlanById: (id) => api.get(`/fd/plans/${id}`),
    createPlan: (data) => api.post('/fd/plans', data),
    updatePlan: (id, data) => api.put(`/fd/plans/${id}`, data),
    getInvestments: () => api.get('/fd/investments'),
    getInvestmentById: (id) => api.get(`/fd/investments/${id}`),
    getInvestmentsByCustomer: (customerId) => api.get(`/fd/investments/customer/${customerId}`),
    getMaturing: (days = 30) => api.get(`/fd/investments/maturing?days=${days}`),
    createInvestment: async (data) => {
        const response = await api.post('/fd/investments', data);
        emitDataChange('fds', { action: 'created', data: response.data });
        return response;
    },
    renew: async (id, data) => {
        const response = await api.post(`/fd/investments/${id}/renew`, data);
        emitDataChange('fds', { action: 'renewed', id });
        return response;
    },
    closeEarly: async (id, data) => {
        const response = await api.post(`/fd/investments/${id}/close-early`, data);
        emitDataChange('fds', { action: 'closed', id });
        return response;
    },
    getInterestHistory: (id) => api.get(`/fd/investments/${id}/interest`),
};

// Employee API (Admin only)
export const employeeAPI = {
    getAll: () => api.get('/admin/users'),
    getById: (id) => api.get(`/admin/users/${id}`),
    create: async (data) => {
        const response = await api.post('/admin/register', data);
        emitDataChange('employees', { action: 'created', data: response.data });
        return response;
    },
    update: async (id, data) => {
        const response = await api.put(`/admin/users/${id}`, data);
        emitDataChange('employees', { action: 'updated', data: response.data });
        return response;
    },
    updateStatus: async (id, status) => {
        const response = await api.patch(`/admin/users/${id}/status`, { status });
        emitDataChange('employees', { action: 'status_changed', id, status });
        return response;
    },
    getBranches: () => api.get('/branches'),
};

export default api;



