import { BarChart2, Wallet, FileText, BookText, Landmark, CreditCard, TrendingUp, Users, Activity, CheckSquare, Plus, Clock, Shield, BookOpen, Settings, User } from 'lucide-react';

// Central registry of all modules in the system.
// Adding a new module = adding one entry here (plus its pages/routes).
export const MODULES = [
  {
    key: 'crm',
    label: 'CRM',
    basePath: '/admin',
    allowedRoles: ['super_admin', 'manager'],
    sidebar: [], // CRM sidebar is role-dependent (manager vs admin), handled separately in AppLayout for now
  },
  {
    key: 'accounting',
    label: 'Accounting',
    basePath: '/accounting',
    allowedRoles: ['super_admin'],
    sidebar: [
      { to: '/accounting', icon: BarChart2, label: 'Dashboard', end: true },
      { to: '/accounting/transactions', icon: FileText, label: 'Transactions' },
      { to: '/accounting/accounts', icon: Wallet, label: 'Chart of Accounts' },
      { to: '/accounting/journal', icon: BookText, label: 'Journal' },
      { to: '/accounting/ledger', icon: BookText, label: 'Ledger' },
      { to: '/accounting/trial-balance', icon: Activity, label: 'Trial Balance' },
      { to: '/accounting/income-statement', icon: TrendingUp, label: 'Income Statement' },
      { to: '/accounting/balance-sheet', icon: Landmark, label: 'Balance Sheet' },
      { to: '/accounting/cash-flow', icon: TrendingUp, label: 'Cash Flow' },
      { to: '/accounting/equity-statement', icon: TrendingUp, label: 'Equity Statement' },
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
    sidebar: [
      { to: '/hr', icon: BarChart2, label: 'Dashboard', end: true },
      { to: '/hr/employees', icon: Users, label: 'Employee Directory' },
      { to: '/hr/organogram', icon: Activity, label: 'Organogram' },
      { to: '/hr/notices', icon: BookText, label: 'Notice Board' },
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

export function getVisibleModules(userRole) {
  return MODULES.filter(m => m.allowedRoles.includes(userRole));
}