import axios from 'axios';
import { getItem } from '@/services/storage';
import { API_BASE_URL } from '@/constants/api';

export const TOKEN_KEY = 'auth_token';

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

export default api;
