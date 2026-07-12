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
import Reconciliation from './pages/accounting/Reconciliation';

import HrDashboard from './pages/hr/Dashboard';
import Notices from './pages/hr/Notices';
import Employees from './pages/hr/Employees';
import Organogram from './pages/hr/Organogram';
import LeaveSettings from './pages/hr/LeaveSettings';
import LeaveApplications from './pages/hr/LeaveApplications';
import LeaveRegister from './pages/hr/LeaveRegister';
import AttendanceOverview from './pages/hr/AttendanceOverview';
import AttendanceSettings from './pages/hr/AttendanceSettings';
import Payroll from './pages/hr/Payroll';
import PayrollSettings from './pages/hr/PayrollSettings';


import Login from './pages/Login';
import CompleteProfile from './pages/CompleteProfile';
import ForceChangePassword from './pages/ForceChangePassword';
import { AdminLayout, UnifiedLayout, AcademyLayout } from './components/Layout/AppLayout';
import AcademyDashboard from './pages/academy/Dashboard';
import Courses from './pages/academy/Courses';
import Batches from './pages/academy/Batches';
import BatchDetail from './pages/academy/BatchDetail';
import Teachers from './pages/academy/Teachers';
import TeacherPayments from './pages/academy/TeacherPayments';
import PaymentRates from './pages/academy/PaymentRates';
import ZoomAccounts from './pages/academy/ZoomAccounts';
import TeacherRegister from './pages/teacher/TeacherRegister';
import TeacherLogin from './pages/teacher/TeacherLogin';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import PortalHome from './pages/portal/PortalHome';
import PortalAttendance from './pages/portal/PortalAttendance';
import PortalLeave from './pages/portal/PortalLeave';
import PortalApprovals from './pages/portal/PortalApprovals';
import PortalProfile from './pages/portal/PortalProfile';
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

function ProtectedRoute({ children, allowedLevels, moduleKey }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="spinner w-10 h-10" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const needsProfile = user.role === 'manager' || (user.role !== 'super_admin' && user.role !== 'advisor' && user.role_level >= 4);
  if (needsProfile && !user.is_profile_complete) {
    return <Navigate to="/complete-profile" replace />;
  }

  // Module-based access: super_admin always passes; otherwise check hr_employee_module_access
 if (moduleKey && user.role !== 'super_admin') {
    const hasModuleAccess = (user.module_access || []).some(a => a.module_key === moduleKey);
    if (!hasModuleAccess) {
      if (user.role === 'employee') return <Navigate to="/portal" replace />;
      if (user.role === 'manager') return <Navigate to="/manager" replace />;
      if (user.role_level <= 2) return <Navigate to="/admin" replace />;
      return <Navigate to="/executive" replace />;
    }
    return children;
  }

 if (allowedLevels && !allowedLevels.includes(user.role_level)) {
    if (user.role === 'employee') return <Navigate to="/portal" replace />;
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
        user.role === 'employee' ? '/portal' :
        user.role === 'manager' ? '/manager' :
        user.role_level <= 2 ? '/admin' : '/executive'
      } /> : <Login />} />

      <Route path="/complete-profile" element={<CompleteProfile />} />

<Route path="/portal" element={<ProtectedRoute><UnifiedLayout><PortalHome /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/portal/attendance" element={<ProtectedRoute><UnifiedLayout><PortalAttendance /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/portal/leave" element={<ProtectedRoute><UnifiedLayout><PortalLeave /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/portal/approvals" element={<ProtectedRoute><UnifiedLayout><PortalApprovals /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/portal/profile" element={<ProtectedRoute><UnifiedLayout><PortalProfile /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/portal/notices" element={<ProtectedRoute><UnifiedLayout><Notices /></UnifiedLayout></ProtectedRoute>} />


<Route path="/change-password" element={<Navigate to="/login" replace />} />

      <Route path="/executive" element={<ProtectedRoute allowedLevels={[4, 5]}><UnifiedLayout><ExecutiveDashboard /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/executive/new-sale" element={<ProtectedRoute allowedLevels={[4, 5]}><UnifiedLayout><NewSale /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/executive/due" element={<ProtectedRoute allowedLevels={[4, 5]}><UnifiedLayout><DueList /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/executive/performance" element={<ProtectedRoute allowedLevels={[4, 5]}><UnifiedLayout><MyPerformance /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/executive/profile" element={<ProtectedRoute allowedLevels={[4, 5]}><UnifiedLayout><Profile /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/executive/approvals" element={<ProtectedRoute allowedLevels={[4, 5]}><UnifiedLayout><MyApprovals /></UnifiedLayout></ProtectedRoute>} />

      <Route path="/manager" element={<ProtectedRoute allowedLevels={[3]}><UnifiedLayout><AdminDashboard /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/manager/new-sale" element={<ProtectedRoute allowedLevels={[3]}><UnifiedLayout><NewSale /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/manager/sales" element={<ProtectedRoute allowedLevels={[3]}><UnifiedLayout><AdminSales /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/manager/due" element={<ProtectedRoute allowedLevels={[3]}><UnifiedLayout><AdminDueList /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/manager/performance" element={<ProtectedRoute allowedLevels={[3]}><UnifiedLayout><MyPerformance /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/manager/approvals" element={<ProtectedRoute allowedLevels={[3]}><UnifiedLayout><SaleApproval /></UnifiedLayout></ProtectedRoute>} />
      <Route path="/manager/profile" element={<ProtectedRoute allowedLevels={[3]}><UnifiedLayout><Profile /></UnifiedLayout></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/new-sale" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><NewSale /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/sales" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><AdminSales /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/due" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><AdminDueList /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/staff" element={<ProtectedRoute allowedLevels={[1]}><AdminLayout><AdminStaff /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/roles" element={<ProtectedRoute allowedLevels={[1]}><AdminLayout><RoleManagement /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/courses" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><CourseManagement /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedLevels={[1]}><AdminLayout><AdminSettings /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/audit" element={<ProtectedRoute allowedLevels={[1]}><AdminLayout><AuditLog /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/approvals" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><SaleApproval /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/profile" element={<ProtectedRoute allowedLevels={[1, 2]}><AdminLayout><Profile /></AdminLayout></ProtectedRoute>} />

<Route path="/accounting" element={<ProtectedRoute allowedLevels={[1]} moduleKey="accounting"><UnifiedLayout><AccountingDashboard /></UnifiedLayout></ProtectedRoute>} />

      <Route path="/accounting/accounts" element={<ProtectedRoute allowedLevels={[1]} moduleKey="accounting"><UnifiedLayout><Accounts /></UnifiedLayout></ProtectedRoute>} />

<Route path="/accounting/transactions" element={<ProtectedRoute allowedLevels={[1]} moduleKey="accounting"><UnifiedLayout><Transactions /></UnifiedLayout></ProtectedRoute>} />

<Route path="/accounting/ledger" element={<ProtectedRoute allowedLevels={[1]} moduleKey="accounting"><UnifiedLayout><Ledger /></UnifiedLayout></ProtectedRoute>} />

<Route path="/accounting/trial-balance" element={<ProtectedRoute allowedLevels={[1]} moduleKey="accounting"><UnifiedLayout><TrialBalance /></UnifiedLayout></ProtectedRoute>} />

<Route path="/accounting/income-statement" element={<ProtectedRoute allowedLevels={[1]} moduleKey="accounting"><UnifiedLayout><IncomeStatement /></UnifiedLayout></ProtectedRoute>} />

<Route path="/accounting/balance-sheet" element={<ProtectedRoute allowedLevels={[1]} moduleKey="accounting"><UnifiedLayout><BalanceSheet /></UnifiedLayout></ProtectedRoute>} />

<Route path="/accounting/cash-flow" element={<ProtectedRoute allowedLevels={[1]} moduleKey="accounting"><UnifiedLayout><CashFlow /></UnifiedLayout></ProtectedRoute>} />

<Route path="/accounting/equity-statement" element={<ProtectedRoute allowedLevels={[1]} moduleKey="accounting"><UnifiedLayout><EquityStatement /></UnifiedLayout></ProtectedRoute>} />

<Route path="/accounting/credit-cards" element={<ProtectedRoute allowedLevels={[1]} moduleKey="accounting"><UnifiedLayout><CreditCards /></UnifiedLayout></ProtectedRoute>} />

<Route path="/accounting/investors" element={<ProtectedRoute allowedLevels={[1]} moduleKey="accounting"><UnifiedLayout><Investors /></UnifiedLayout></ProtectedRoute>} />

<Route path="/accounting/shareholders" element={<ProtectedRoute allowedLevels={[1]} moduleKey="accounting"><UnifiedLayout><Shareholders /></UnifiedLayout></ProtectedRoute>} />

<Route path="/accounting/journal" element={<ProtectedRoute allowedLevels={[1]} moduleKey="accounting"><UnifiedLayout><Journal /></UnifiedLayout></ProtectedRoute>} />
<Route path="/accounting/reconciliation" element={<ProtectedRoute allowedLevels={[1]} moduleKey="accounting"><UnifiedLayout><Reconciliation /></UnifiedLayout></ProtectedRoute>} />

<Route path="/hr" element={<ProtectedRoute allowedLevels={[1]} moduleKey="hr"><UnifiedLayout><HrDashboard /></UnifiedLayout></ProtectedRoute>} />

<Route path="/hr/employees" element={<ProtectedRoute allowedLevels={[1]} moduleKey="hr"><UnifiedLayout><Employees /></UnifiedLayout></ProtectedRoute>} />

<Route path="/hr/organogram" element={<ProtectedRoute allowedLevels={[1]} moduleKey="hr"><UnifiedLayout><Organogram /></UnifiedLayout></ProtectedRoute>} />

<Route path="/hr/leave-settings" element={<ProtectedRoute allowedLevels={[1]} moduleKey="hr"><UnifiedLayout><LeaveSettings /></UnifiedLayout></ProtectedRoute>} />

<Route path="/hr/leave-applications" element={<ProtectedRoute allowedLevels={[1]} moduleKey="hr"><UnifiedLayout><LeaveApplications /></UnifiedLayout></ProtectedRoute>} />

<Route path="/hr/leave-register" element={<ProtectedRoute allowedLevels={[1]} moduleKey="hr"><UnifiedLayout><LeaveRegister /></UnifiedLayout></ProtectedRoute>} />

<Route path="/hr/attendance" element={<ProtectedRoute allowedLevels={[1]} moduleKey="hr"><UnifiedLayout><AttendanceOverview /></UnifiedLayout></ProtectedRoute>} />

<Route path="/hr/attendance-settings" element={<ProtectedRoute allowedLevels={[1]} moduleKey="hr"><UnifiedLayout><AttendanceSettings /></UnifiedLayout></ProtectedRoute>} />

<Route path="/hr/payroll" element={<ProtectedRoute allowedLevels={[1]} moduleKey="hr"><UnifiedLayout><Payroll /></UnifiedLayout></ProtectedRoute>} />

<Route path="/hr/payroll-settings" element={<ProtectedRoute allowedLevels={[1]} moduleKey="hr"><UnifiedLayout><PayrollSettings /></UnifiedLayout></ProtectedRoute>} />

<Route path="/hr/notices" element={<ProtectedRoute allowedLevels={[1]} moduleKey="hr"><UnifiedLayout><Notices /></UnifiedLayout></ProtectedRoute>} />


      <Route path="/academy" element={<ProtectedRoute allowedLevels={[1]}><AcademyLayout><AcademyDashboard /></AcademyLayout></ProtectedRoute>} />
      <Route path="/academy/courses" element={<ProtectedRoute allowedLevels={[1]}><AcademyLayout><Courses /></AcademyLayout></ProtectedRoute>} />
      <Route path="/academy/batches" element={<ProtectedRoute allowedLevels={[1]}><AcademyLayout><Batches /></AcademyLayout></ProtectedRoute>} />
      <Route path="/academy/batches/:id" element={<ProtectedRoute allowedLevels={[1]}><AcademyLayout><BatchDetail /></AcademyLayout></ProtectedRoute>} />
      <Route path="/academy/teachers" element={<ProtectedRoute allowedLevels={[1]}><AcademyLayout><Teachers /></AcademyLayout></ProtectedRoute>} />
      <Route path="/academy/teacher-payments" element={<ProtectedRoute allowedLevels={[1]}><AcademyLayout><TeacherPayments /></AcademyLayout></ProtectedRoute>} />
      <Route path="/academy/payment-rates" element={<ProtectedRoute allowedLevels={[1]}><AcademyLayout><PaymentRates /></AcademyLayout></ProtectedRoute>} />
      <Route path="/academy/zoom-accounts" element={<ProtectedRoute allowedLevels={[1]}><AcademyLayout><ZoomAccounts /></AcademyLayout></ProtectedRoute>} />

      {/* Teacher portal — public */}
      <Route path="/teacher/register"  element={<TeacherRegister />} />
      <Route path="/teacher/login"     element={<TeacherLogin />} />
      <Route path="/teacher/dashboard" element={<TeacherDashboard />} />

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