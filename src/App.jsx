import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import Transactions from './pages/accounting/Transactions';
import AccountingDashboard from './pages/accounting/Dashboard';
import Ledger from './pages/accounting/Ledger';
import TrialBalance from './pages/accounting/TrialBalance';
import IncomeStatement from './pages/accounting/IncomeStatement';
import BalanceSheet from './pages/accounting/BalanceSheet';
import CashFlow from './pages/accounting/CashFlow';
import EquityStatement from './pages/accounting/EquityStatement';
import CreditCards from './pages/accounting/CreditCards';
import Investors from './pages/accounting/Investors';
import Shareholders from './pages/accounting/Shareholders';
import Journal from './pages/accounting/Journal';

import HrDashboard from './pages/hr/Dashboard';
import Employees from './pages/hr/Employees';
import Organogram from './pages/hr/Organogram';



import Login from './pages/Login';
import CompleteProfile from './pages/CompleteProfile';
import { ExecutiveLayout, AdminLayout, AccountingLayout, HrLayout } from './components/Layout/AppLayout';
import Accounts from './pages/accounting/Accounts';

import ExecutiveDashboard from './pages/executive/Dashboard';
import NewSale from './pages/executive/NewSale';
import DueList from './pages/executive/DueList';
import Profile from './pages/executive/Profile';
import MyPerformance from './pages/executive/MyPerformance';
import MyApprovals from './pages/executive/MyApprovals';

import AdminDashboard from './pages/admin/Dashboard';
import AdminSales from './pages/admin/Sales';
import AdminStaff from './pages/admin/Staff';
import RoleManagement from './pages/admin/RoleManagement';
import AuditLog from './pages/admin/AuditLog';
import SaleApproval from './pages/admin/SaleApproval';
import { AdminDueList, AdminSettings, CourseManagement } from './pages/admin/AdminPages';

function ProtectedRoute({ children, allowedLevels }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="spinner w-10 h-10" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const needsProfile = user.role === 'manager' || (user.role !== 'super_admin' && user.role !== 'advisor' && user.role_level >= 4);
  if (needsProfile && !user.is_profile_complete) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (allowedLevels && !allowedLevels.includes(user.role_level)) {
    if (user.role === 'manager') return <Navigate to="/manager" replace />;
    if (user.role_level <= 2) return <Navigate to="/admin" replace />;
    return <Navigate to="/executive" replace />;
  }
  return children;
}


function AppRoutes() {
useNotifications();

  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={
        user.role === 'manager' ? '/manager' :
        user.role_level <= 2 ? '/admin' : '/executive'
      } /> : <Login />} />

      <Route path="/complete-profile" element={<CompleteProfile />} />

      <Route path="/executive" element={<ProtectedRoute allowedLevels={[4, 5]}><ExecutiveLayout><ExecutiveDashboard /></ExecutiveLayout></ProtectedRoute>} />
      <Route path="/executive/new-sale" element={<ProtectedRoute allowedLevels={[4, 5]}><ExecutiveLayout><NewSale /></ExecutiveLayout></ProtectedRoute>} />
      <Route path="/executive/due" element={<ProtectedRoute allowedLevels={[4, 5]}><ExecutiveLayout><DueList /></ExecutiveLayout></ProtectedRoute>} />
      <Route path="/executive/performance" element={<ProtectedRoute allowedLevels={[4, 5]}><ExecutiveLayout><MyPerformance /></ExecutiveLayout></ProtectedRoute>} />
      <Route path="/executive/profile" element={<ProtectedRoute allowedLevels={[4, 5]}><ExecutiveLayout><Profile /></ExecutiveLayout></ProtectedRoute>} />
      <Route path="/executive/approvals" element={<ProtectedRoute allowedLevels={[4, 5]}><ExecutiveLayout><MyApprovals /></ExecutiveLayout></ProtectedRoute>} />

      <Route path="/manager" element={<ProtectedRoute allowedLevels={[3]}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
      <Route path="/manager/new-sale" element={<ProtectedRoute allowedLevels={[3]}><AdminLayout><NewSale /></AdminLayout></ProtectedRoute>} />
      <Route path="/manager/sales" element={<ProtectedRoute allowedLevels={[3]}><AdminLayout><AdminSales /></AdminLayout></ProtectedRoute>} />
      <Route path="/manager/due" element={<ProtectedRoute allowedLevels={[3]}><AdminLayout><AdminDueList /></AdminLayout></ProtectedRoute>} />
      <Route path="/manager/performance" element={<ProtectedRoute allowedLevels={[3]}><AdminLayout><MyPerformance /></AdminLayout></ProtectedRoute>} />
      <Route path="/manager/approvals" element={<ProtectedRoute allowedLevels={[3]}><AdminLayout><SaleApproval /></AdminLayout></ProtectedRoute>} />
      <Route path="/manager/profile" element={<ProtectedRoute allowedLevels={[3]}><AdminLayout><Profile /></AdminLayout></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/new-sale" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><NewSale /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/sales" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><AdminSales /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/due" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><AdminDueList /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/staff" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><AdminStaff /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/roles" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><RoleManagement /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/courses" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><CourseManagement /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><AdminSettings /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/audit" element={<ProtectedRoute allowedLevels={[1]}><AdminLayout><AuditLog /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/approvals" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><SaleApproval /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/profile" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><Profile /></AdminLayout></ProtectedRoute>} />

   <Route path="/accounting" element={<ProtectedRoute allowedLevels={[1]}><AccountingLayout><AccountingDashboard /></AccountingLayout></ProtectedRoute>} />

      <Route path="/accounting/accounts" element={<ProtectedRoute allowedLevels={[1]}><AccountingLayout><Accounts /></AccountingLayout></ProtectedRoute>} />

<Route path="/accounting/transactions" element={<ProtectedRoute allowedLevels={[1]}><AccountingLayout><Transactions /></AccountingLayout></ProtectedRoute>} />

<Route path="/accounting/ledger" element={<ProtectedRoute allowedLevels={[1]}><AccountingLayout><Ledger /></AccountingLayout></ProtectedRoute>} />

<Route path="/accounting/trial-balance" element={<ProtectedRoute allowedLevels={[1]}><AccountingLayout><TrialBalance /></AccountingLayout></ProtectedRoute>} />

<Route path="/accounting/income-statement" element={<ProtectedRoute allowedLevels={[1]}><AccountingLayout><IncomeStatement /></AccountingLayout></ProtectedRoute>} />

<Route path="/accounting/balance-sheet" element={<ProtectedRoute allowedLevels={[1]}><AccountingLayout><BalanceSheet /></AccountingLayout></ProtectedRoute>} />

<Route path="/accounting/cash-flow" element={<ProtectedRoute allowedLevels={[1]}><AccountingLayout><CashFlow /></AccountingLayout></ProtectedRoute>} />

<Route path="/accounting/equity-statement" element={<ProtectedRoute allowedLevels={[1]}><AccountingLayout><EquityStatement /></AccountingLayout></ProtectedRoute>} />

<Route path="/accounting/credit-cards" element={<ProtectedRoute allowedLevels={[1]}><AccountingLayout><CreditCards /></AccountingLayout></ProtectedRoute>} />

<Route path="/accounting/investors" element={<ProtectedRoute allowedLevels={[1]}><AccountingLayout><Investors /></AccountingLayout></ProtectedRoute>} />

<Route path="/accounting/shareholders" element={<ProtectedRoute allowedLevels={[1]}><AccountingLayout><Shareholders /></AccountingLayout></ProtectedRoute>} />

<Route path="/accounting/journal" element={<ProtectedRoute allowedLevels={[1]}><AccountingLayout><Journal /></AccountingLayout></ProtectedRoute>} />

<Route path="/hr" element={<ProtectedRoute allowedLevels={[1]}><HrLayout><HrDashboard /></HrLayout></ProtectedRoute>} />

<Route path="/hr/employees" element={<ProtectedRoute allowedLevels={[1]}><HrLayout><Employees /></HrLayout></ProtectedRoute>} />

<Route path="/hr/organogram" element={<ProtectedRoute allowedLevels={[1]}><HrLayout><Organogram /></HrLayout></ProtectedRoute>} />





      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
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