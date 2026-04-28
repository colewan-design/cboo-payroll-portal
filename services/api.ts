import axios, { type AxiosResponse } from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { getItem } from '@/services/storage';
import { setCache, getCache } from '@/services/cache';
import { API_BASE_URL } from '@/constants/api';

export const TOKEN_KEY = 'auth_token';

// GET endpoints whose responses should be cached for offline use
const CACHEABLE = [
  '/api/announcements',
  '/api/employee/payslips',
  '/api/employee/me',
  '/api/user',
];

function cacheKey(url: string, params?: Record<string, unknown>): string {
  const qs = params ? `?${JSON.stringify(params)}` : '';
  return `api_${url}${qs}`;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On success: persist cacheable GET responses to disk
api.interceptors.response.use(
  async (response: AxiosResponse) => {
    const method = response.config.method?.toLowerCase();
    const url = response.config.url ?? '';

    if (method === 'get' && CACHEABLE.some((p) => url.includes(p))) {
      const key = cacheKey(url, response.config.params);
      await setCache(key, response.data);
    }

    return response;
  },

  // On network failure: serve cached data for GET requests instead of rejecting
  async (error) => {
    const isNetworkError =
      error.code === 'ECONNABORTED' ||
      error.message === 'Network Error' ||
      !error.response;

    const config = error.config;
    const method = config?.method?.toLowerCase();
    const url = config?.url ?? '';

    if (isNetworkError && method === 'get' && CACHEABLE.some((p) => url.includes(p))) {
      const key = cacheKey(url, config.params);
      const cached = await getCache(key);
      if (cached !== null) {
        // Return a synthetic response so callers work without changes
        return Promise.resolve({ data: cached, status: 200, cached: true } as any);
      }
    }

    return Promise.reject(error);
  },
);

export const getAnnouncements = (page = 1) =>
  api.get('/api/announcements', { params: { page } });

export const getAnnouncement = (id: number) =>
  api.get(`/api/announcements/${id}`);

export const registerDeviceToken = (token: string, platform: 'android' | 'ios') =>
  api.post('/api/device-token', { token, platform });

export const removeDeviceToken = (token: string) =>
  api.delete('/api/device-token', { data: { token } });

export const getPayslipBreakdown = (id: number) =>
  api.get(`/api/employee/payslip/breakdown/${id}`);

export const changePassword = (
  currentPassword: string,
  newPassword: string,
) =>
  api.post('/api/user/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
    new_password_confirmation: newPassword,
  });

export { NetInfo };
export default api;
