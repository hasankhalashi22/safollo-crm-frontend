import axios from 'axios';

const BASE = 'https://safollo-crm-backend.onrender.com';

const teacherAxios = axios.create({ baseURL: BASE });

teacherAxios.interceptors.request.use(cfg => {
  const token = localStorage.getItem('teacher_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const teacherApi = {
  register: (data)    => teacherAxios.post('/api/teacher/register', data),
  login:    (data)    => teacherAxios.post('/api/teacher/login', data),
  getMe:    ()        => teacherAxios.get('/api/teacher/me'),
  getMyClasses:  ()   => teacherAxios.get('/api/teacher/classes'),
  getMyPayments: ()   => teacherAxios.get('/api/teacher/payments'),

  // Admin
  getPending:         ()          => teacherAxios.get('/api/teacher/pending'),
  approve:            (id, approved) => teacherAxios.post(`/api/teacher/${id}/approve`, { approved }),
  resetPassword:      (id, password) => teacherAxios.post(`/api/teacher/${id}/reset-password`, { password }),
};
