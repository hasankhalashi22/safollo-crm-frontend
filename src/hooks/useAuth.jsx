import { useState, useEffect, createContext, useContext } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    const savedUser = localStorage.getItem('crm_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Refresh user data including module_access
      authApi.getMe().then(r => {
        const fresh = r.data || r;
        localStorage.setItem('crm_user', JSON.stringify(fresh));
        setUser(fresh);
      }).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('crm_token', token);
    localStorage.setItem('crm_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setUser(null);
  };

  const isAdmin    = user?.role === 'super_admin';
  const isAdvisor  = user?.role === 'advisor';
  const isManager  = user?.role === 'manager';
  const isExecutive= user?.role === 'executive';
  const roleLevel  = user?.role_level || 4;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isAdvisor, isManager, isExecutive, roleLevel }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
