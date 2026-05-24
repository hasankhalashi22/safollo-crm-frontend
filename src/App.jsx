import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useEffect } from 'react';
import Login from './pages/Login';
import { ExecutiveLayout, AdminLayout } from './components/Layout/AppLayout';
import CompleteProfile from './pages/CompleteProfile';

// Executive pages
import ExecutiveDashboard from './pages/executive/Dashboard';
import NewSale from './pages/executive/NewSale';
import DueList from './pages/executive/DueList';
import Profile from './pages/executive/Profile';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminSales from './pages/admin/Sales';
import AdminStaff from './pages/admin/Staff';
import { AdminDueList, AdminSettings } from './pages/admin/AdminPages';

// Protected route
function ProtectedRoute({ children, allowedLevels }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="spinner w-10 h-10" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  // Super Admin ও Advisor-এর profile mandatory না
  const needsProfile = user.role !== 'super_admin' && user.role !== 'advisor';

  // Profile complete না হলে profile page-এ redirect
  if (needsProfile && !user.is_profile_complete) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (allowedLevels && !allowedLevels.includes(user.role_level)) {
    if (user.role_level <= 2) return <Navigate to="/admin" replace />;
    if (user.role === 'manager') return <Navigate to="/manager" replace />;
    return <Navigate to="/executive" replace />;
  }
  return children;
}
function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role_level <= 2 ? '/admin' : '/executive'} /> : <Login />} />

      {/* Executive routes */}
      <Route path="/executive" element={
        <ProtectedRoute allowedLevels={[3, 4]}>
          <ExecutiveLayout><ExecutiveDashboard /></ExecutiveLayout>
        </ProtectedRoute>
      } />
      <Route path="/executive/new-sale" element={
        <ProtectedRoute allowedLevels={[3, 4]}>
          <ExecutiveLayout><NewSale /></ExecutiveLayout>
        </ProtectedRoute>
      } />
      <Route path="/executive/due" element={
        <ProtectedRoute allowedLevels={[3, 4]}>
          <ExecutiveLayout><DueList /></ExecutiveLayout>
        </ProtectedRoute>
      } />
      <Route path="/executive/profile" element={
        <ProtectedRoute allowedLevels={[3, 4]}>
          <ExecutiveLayout><Profile /></ExecutiveLayout>
        </ProtectedRoute>
      } />

      {/* Manager routes */}
     {/* Manager routes */}
      <Route path="/manager" element={
        <ProtectedRoute allowedLevels={[3]}>
          <AdminLayout><AdminDashboard /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/manager/new-sale" element={
        <ProtectedRoute allowedLevels={[3]}>
          <AdminLayout><NewSale /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/manager/sales" element={
        <ProtectedRoute allowedLevels={[3]}>
          <AdminLayout><AdminSales /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/manager/due" element={
        <ProtectedRoute allowedLevels={[3]}>
          <AdminLayout><AdminDueList /></AdminLayout>
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedLevels={[1, 2]}>
          <AdminLayout><AdminDashboard /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/sales" element={
        <ProtectedRoute allowedLevels={[1, 2]}>
          <AdminLayout><AdminSales /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/due" element={
        <ProtectedRoute allowedLevels={[1, 2]}>
          <AdminLayout><AdminDueList /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/staff" element={
        <ProtectedRoute allowedLevels={[1, 2]}>
          <AdminLayout><AdminStaff /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/courses" element={
        <ProtectedRoute allowedLevels={[1, 2]}>
          <AdminLayout><AdminSettings /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/settings" element={
        <ProtectedRoute allowedLevels={[1, 2]}>
          <AdminLayout><AdminSettings /></AdminLayout>
        </ProtectedRoute>
      } />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
<Route path="/complete-profile" element={<CompleteProfile />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: { fontFamily: 'Hind Siliguri, sans-serif', fontSize: '14px' },
            success: { iconTheme: { primary: '#1A7A6E', secondary: 'white' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
