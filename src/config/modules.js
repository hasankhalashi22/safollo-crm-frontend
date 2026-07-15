import { BarChart2, Wallet, FileText, BookText, Landmark, CreditCard, TrendingUp, Users, Activity, CheckSquare, Plus, Clock, Shield, BookOpen, Settings, User, DollarSign, Calendar, GraduationCap, BookMarked, Layers, UserCheck, Banknote, Video } from 'lucide-react';

// Central registry of all modules in the system.
// Adding a new module = adding one entry here (plus its pages/routes).
export const MODULES = [
  {
    key: 'crm',
    label: 'CRM',
    basePath: '/admin',
    allowedRoles: ['super_admin', 'manager'],
    sidebar: [], // CRM sidebar is role-dependent (manager vs admin), handled separately in AppLayout for now
    rolesSource: 'dynamic', // CRM roles come from the roles table via API, not hardcoded here
  },
  {
    key: 'accounting',
    label: 'Accounting',
    basePath: '/accounting',
    allowedRoles: ['super_admin'],
    roles: [
      { key: 'viewer', label: 'Viewer (দেখতে পারবে)' },
      { key: 'editor', label: 'Editor (যুক্ত/পরিবর্তন করতে পারবে)' },
      { key: 'admin', label: 'Admin (সম্পূর্ণ নিয়ন্ত্রণ)' },
    ],
    sidebar: [
      { to: '/accounting', icon: BarChart2, label: 'Dashboard', end: true },
      { to: '/accounting/transactions', icon: FileText, label: 'Transaction Entry' },
      { to: '/accounting/accounts', icon: Wallet, label: 'Chart of Accounts' },
      {
        group: 'books', label: 'Journal, Ledger, Trial Balance', icon: BookText,
        children: [
          { to: '/accounting/journal', icon: BookText, label: 'Journal' },
          { to: '/accounting/ledger', icon: BookText, label: 'Ledger' },
          { to: '/accounting/trial-balance', icon: Activity, label: 'Trial Balance' },
        ],
      },
      {
        group: 'statements', label: 'Statement', icon: TrendingUp,
        children: [
          { to: '/accounting/income-statement', icon: TrendingUp, label: 'Income Statement' },
          { to: '/accounting/balance-sheet', icon: Landmark, label: 'Balance Sheet' },
          { to: '/accounting/cash-flow', icon: TrendingUp, label: 'Cash Flow Statement' },
          { to: '/accounting/equity-statement', icon: TrendingUp, label: 'Equity Statement' },
        ],
      },
      { to: '/accounting/reconciliation', icon: CheckSquare, label: 'Reconciliation' },
      { to: '/accounting/credit-cards', icon: CreditCard, label: 'Credit Cards' },
      { to: '/accounting/investors', icon: TrendingUp, label: 'Investors' },
      { to: '/accounting/shareholders', icon: Users, label: 'Shareholders' },
    ],
  },
 {
    key: 'hr',
    label: 'HR',
    basePath: '/hr',
    allowedRoles: ['super_admin'],
    roles: [
      { key: 'viewer', label: 'HR Viewer (শুধু দেখতে পারবে)' },
      { key: 'hr_manager', label: 'HR Manager (Settings ও Module Access ছাড়া সব)' },
      { key: 'hr_advisor', label: 'HR Advisor (Settings ও Module Access সহ সব)' },
    ],
   sidebar: [
      { to: '/hr', icon: BarChart2, label: 'Dashboard', end: true },
      { to: '/hr/employees', icon: Users, label: 'Employee Directory' },
      { to: '/hr/organogram', icon: Activity, label: 'Organogram' },
      { group: 'leave', icon: Calendar, label: 'Leave', children: [
        { to: '/hr/leave-settings', icon: BookText, label: 'Leave Settings' },
        { to: '/hr/leave-applications', icon: CheckSquare, label: 'Leave Applications' },
        { to: '/hr/leave-register', icon: BookText, label: 'Leave Register' },
      ]},
      { group: 'attendance', icon: Clock, label: 'Attendance', children: [
        { to: '/hr/attendance', icon: Clock, label: 'Attendance Overview' },
        { to: '/hr/attendance-settings', icon: Settings, label: 'Attendance Settings' },
      ]},
      { group: 'payroll', icon: DollarSign, label: 'Payroll', children: [
        { to: '/hr/payroll', icon: DollarSign, label: 'Payroll' },
        { to: '/hr/payroll-settings', icon: Settings, label: 'Payroll Settings' },
      ]},
      { to: '/hr/notices', icon: BookText, label: 'Notice Board' },
    ],
  },
  {
    key: 'academy',
    label: 'Academy',
    basePath: '/academy',
    allowedRoles: ['super_admin'],
    roles: [
      { key: 'viewer', label: 'Academy Viewer (শুধু দেখতে পারবে)' },
      { key: 'editor', label: 'Academy Editor (তৈরি/এডিট ও ফিডব্যাক Approve)' },
      { key: 'admin', label: 'Academy Admin (Editor + Settings + ডিলিট)' },
    ],
    sidebar: [
      { to: '/academy', icon: BarChart2, label: 'Dashboard', end: true },
      { to: '/academy/courses', icon: BookMarked, label: 'Courses & Plans' },
      { to: '/academy/batches', icon: Layers, label: 'Routines' },
      { to: '/academy/teachers', icon: UserCheck, label: 'Teachers' },
      { to: '/academy/teacher-payments', icon: Banknote, label: 'Teacher Payments' },
      { to: '/academy/payment-rates', icon: DollarSign, label: 'Payment Rates' },
      { to: '/academy/zoom-accounts', icon: Video, label: 'Zoom Accounts' },
      { to: '/academy/schedule-report', icon: Calendar, label: 'ক্লাস রিপোর্ট' },
      { to: '/academy/settings', icon: Settings, label: 'Settings' },
    ],
  },
  // Future modules go here, e.g.:
  // { key: 'teacher', label: 'Teacher Management', basePath: '/teacher', allowedRoles: ['super_admin', 'academic_coordinator'], sidebar: [...] },
  // { key: 'parcel', label: 'Parcel Management', basePath: '/parcel', allowedRoles: ['super_admin', 'logistics'], sidebar: [...] },
];

export function getModuleForPath(pathname) {
  // Find the most specific matching module by basePath
  const sorted = [...MODULES].sort((a, b) => b.basePath.length - a.basePath.length);
  return sorted.find(m => pathname.startsWith(m.basePath)) || MODULES[0];
}

export function getVisibleModules(user) {
  if (!user) return [];
  if (user.role === 'super_admin') return MODULES; // super_admin sees everything

  const accessibleKeys = (user.module_access || []).map(a => a.module_key);
  return MODULES.filter(m => m.allowedRoles.includes(user.role) || accessibleKeys.includes(m.key));
}