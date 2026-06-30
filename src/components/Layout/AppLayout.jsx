import { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Home, Plus, Clock, User, BarChart2, Users, BookOpen, Settings, LogOut, TrendingUp, Shield, Menu, X, Activity, CheckSquare, Wallet, FileText, BookText, Landmark, CreditCard, ChevronLeft, ChevronRight, ChevronDown, Calendar, Briefcase } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MODULES, getModuleForPath, getVisibleModules } from '../../config/modules';
import { leaveApi, approvalsApi, hrApi } from '../../api/client';

function AdminGroupItem({ item, collapsed, anyActive, onClose, location, isOpen: controlledOpen, onToggle }) {
  const [localOpen, setLocalOpen] = useState(anyActive);
  const open = controlledOpen !== undefined ? controlledOpen : localOpen;
  const toggle = onToggle || (() => setLocalOpen(v => !v));
  const Icon = item.icon;
  return (
    <div>
      <button onClick={toggle}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
          ${anyActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}>
        <Icon size={18} className="flex-shrink-0" />
        {!collapsed && <><span className="flex-1 text-left" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
          <ChevronDown size={14} className={`transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} /></>}
      </button>
      {open && !collapsed && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
          {item.children.map(({ to, icon: CIcon, label }) => (
            <NavLink key={to} to={to} onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all
                 ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`}>
              <CIcon size={16} className="flex-shrink-0" />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function TopModuleBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const visibleModules = getVisibleModules(user);
  if (visibleModules.length <= 1) return null;

  const currentModule = getModuleForPath(location.pathname);

  return (
    <div className="bg-gray-900 px-4 flex items-center gap-1 overflow-x-auto">
      {visibleModules.map(m => (
        <button key={m.key} onClick={() => navigate(m.basePath)}
          className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${currentModule.key === m.key ? 'text-white border-primary-400' : 'text-gray-400 border-transparent hover:text-gray-200'}`}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

export function ExecutiveLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [pendingDueCount, setPendingDueCount] = useState(0);

  useEffect(() => {
    approvalsApi.getPending().then(r => setPendingApprovalCount((r.data || []).length)).catch(() => {});
    approvalsApi.getPendingDue().then(r => setPendingDueCount((r.data || []).length)).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('লগআউট হয়েছে');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-primary-500 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-8 brightness-0 invert" />
        <button onClick={handleLogout} className="p-2 rounded-xl bg-primary-600 active:scale-95">
          <LogOut size={18} />
        </button>
      </div>

      <main className="page-enter">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-10">
        <div className="flex items-center justify-around px-1 py-2">
          <NavLink to="/executive" end className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${isActive ? 'text-primary-500' : 'text-gray-400'}`}>
            <Home size={20} />
            <span className="text-xs">হোম</span>
          </NavLink>
          <NavLink to="/executive/new-sale" className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${isActive ? 'text-primary-500' : 'text-gray-400'}`}>
            <div className="bg-primary-500 text-white rounded-full p-2.5 -mt-6 shadow-lg">
              <Plus size={22} />
            </div>
            <span className="text-xs text-gray-400 mt-0.5">নতুন সেল</span>
          </NavLink>
          <NavLink to="/executive/approvals" className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${isActive ? 'text-primary-500' : 'text-gray-400'}`}>
            <div className="relative">
              <CheckSquare size={20} />
              {pendingApprovalCount > 0 && <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center leading-none">{pendingApprovalCount}</span>}
            </div>
            <span className="text-xs">Pending</span>
          </NavLink>
          <NavLink to="/executive/performance" className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${isActive ? 'text-primary-500' : 'text-gray-400'}`}>
            <TrendingUp size={20} />
            <span className="text-xs">পারফরম্যান্স</span>
          </NavLink>
          <NavLink to="/executive/due" className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${isActive ? 'text-primary-500' : 'text-gray-400'}`}>
            <div className="relative">
              <Clock size={20} />
              {pendingDueCount > 0 && <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center leading-none">{pendingDueCount}</span>}
            </div>
            <span className="text-xs">বকেয়া</span>
          </NavLink>
          <NavLink to="/executive/profile" className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${isActive ? 'text-primary-500' : 'text-gray-400'}`}>
            <User size={20} />
            <span className="text-xs">প্রোফাইল</span>
          </NavLink>
          {user?.has_ess && (
            <button onClick={() => navigate('/portal')}
              className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all text-primary-500">
              <Home size={20} />
              <span className="text-xs">Portal</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

export function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Advisor uses UnifiedLayout (module-wise collapsible sidebar)
  if (user?.role === 'advisor') return <UnifiedLayout>{children}</UnifiedLayout>;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [pendingDueCount, setPendingDueCount] = useState(0);

  useEffect(() => {
    approvalsApi.getPending().then(r => setPendingApprovalCount((r.data || []).length)).catch(() => {});
    approvalsApi.getPendingDue().then(r => setPendingDueCount((r.data || []).length)).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('লগআউট হয়েছে');
  };

  const location = useLocation();
  const isManager = user?.role === 'manager';
  const isSuperAdmin = user?.role === 'super_admin';

  const managerNav = [
    { to: '/manager', icon: BarChart2, label: 'ড্যাশবোর্ড', end: true },
    { to: '/manager/approvals', icon: CheckSquare, label: 'সেল Approval' },
    { to: '/manager/new-sale', icon: Plus, label: 'নতুন সেল' },
    { to: '/manager/sales', icon: BarChart2, label: 'সেলস রিপোর্ট' },
    { to: '/manager/due', icon: Clock, label: 'বকেয়া তালিকা' },
    { to: '/manager/performance', icon: TrendingUp, label: 'পারফরম্যান্স' },
    { to: '/manager/profile', icon: User, label: 'আমার প্রোফাইল' },
  ];

  const adminNav = [
    { to: '/admin', icon: BarChart2, label: 'ড্যাশবোর্ড', end: true },
    { to: '/admin/approvals', icon: CheckSquare, label: 'সেল Approval' },
    { to: '/admin/new-sale', icon: Plus, label: 'নতুন সেল' },
    { to: '/admin/sales', icon: BarChart2, label: 'সেলস রিপোর্ট' },
    { to: '/admin/due', icon: Clock, label: 'বকেয়া তালিকা' },
    { to: '/admin/courses', icon: BookOpen, label: 'কোর্স ম্যানেজমেন্ট' },
    { to: '/admin/profile', icon: User, label: 'আমার প্রোফাইল' },
    ...(isSuperAdmin ? [{
      group: 'system_settings', label: 'Settings', icon: Settings,
      children: [
        { to: '/admin/roles', icon: Shield, label: 'Role Management' },
        { to: '/admin/audit', icon: Activity, label: 'Activity Log' },
        { to: '/admin/settings', icon: Settings, label: 'সিস্টেম সেটিংস' },
      ],
    }] : []),
  ];

  let navItems;
  let navLabel;
  if (location.pathname.startsWith('/hr')) {
    navItems = MODULES.find(m => m.key === 'hr')?.sidebar || [];
    navLabel = 'HR Module';
  } else if (location.pathname.startsWith('/accounting')) {
    navItems = MODULES.find(m => m.key === 'accounting')?.sidebar || [];
    navLabel = 'Accounting Module';
  } else {
    navItems = isManager ? managerNav : adminNav;
    navLabel = getModuleForPath(location.pathname)?.label || 'CRM';
  }

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        {!collapsed && (
          <div>
            <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-10 mb-1" />
            <p className="text-xs text-gray-400">{navLabel}</p>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 bg-gray-100 rounded-lg text-gray-500 hover:bg-gray-200 hidden lg:flex items-center justify-center ml-auto">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.group) {
            return (
              <AdminGroupItem key={item.group} item={item} collapsed={collapsed}
                anyActive={item.children.some(c => location.pathname === c.to || location.pathname.startsWith(c.to + '/'))}
                onClose={() => setSidebarOpen(false)} location={location} />
            );
          }
          const { to, icon: Icon, label, end } = item;
          const badgeCount = to.includes('/approvals') ? pendingApprovalCount : to.includes('/due') ? pendingDueCount : 0;
          return (
            <NavLink key={to} to={to} end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                 ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'}`
              }>
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="flex-1" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
              {!collapsed && badgeCount > 0 && (<span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">{badgeCount}</span>)}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-bold text-sm">{(user?.full_name || user?.phone)?.[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || user?.phone}</p>
              <p className="text-xs text-gray-400">{user?.role_label}</p>
            </div>
          </div>
        )}
        {user?.has_ess && (
          <button onClick={() => navigate('/portal')}
            className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-xl transition-all mb-1 ${collapsed ? 'justify-center' : ''}`}>
            <Home size={16} />
            {!collapsed && 'My Portal (ESS)'}
          </button>
        )}
        <button onClick={handleLogout}
          className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all ${collapsed ? 'justify-center' : ''}`}>
          <LogOut size={16} />
          {!collapsed && 'লগআউট'}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <TopModuleBar />
      <div className="flex flex-1 overflow-hidden">
        <aside className={`hidden lg:flex bg-white border-r border-gray-100 flex-col shadow-sm flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
          <SidebarContent />
        </aside>

        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside className="relative w-72 bg-white flex flex-col shadow-xl">
              <button onClick={() => setSidebarOpen(false)}
                className="absolute top-3 right-3 p-1.5 bg-gray-100 rounded-full z-10">
                <X size={18} />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl bg-gray-100">
              <Menu size={20} className="text-gray-600" />
            </button>
            <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-8" />
          </div>
          <main className="flex-1 overflow-y-auto page-enter">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function AccountingLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openAccGroup, setOpenAccGroup] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('লগআউট হয়েছে');
  };

  const navItems = MODULES.find(m => m.key === 'accounting').sidebar;

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        {!collapsed && (
          <div>
            <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-10 mb-1" />
            <p className="text-xs text-gray-400">Accounting Module</p>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 bg-gray-100 rounded-lg text-gray-500 hover:bg-gray-200 hidden lg:flex items-center justify-center ml-auto">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.group) {
            return (
              <AdminGroupItem key={item.group} item={item} collapsed={collapsed}
                anyActive={item.children.some(c => location.pathname === c.to || location.pathname.startsWith(c.to + '/'))}
                onClose={() => setSidebarOpen(false)} location={location}
                isOpen={openAccGroup === item.group}
                onToggle={() => setOpenAccGroup(prev => prev === item.group ? null : item.group)} />
            );
          }
          const { to, icon: Icon, label, end } = item;
          return (
            <NavLink key={to} to={to} end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                 ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'}`
              }>
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-bold text-sm">{(user?.full_name || user?.phone)?.[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || user?.phone}</p>
              <p className="text-xs text-gray-400">{user?.role_label}</p>
            </div>
          </div>
        )}
        {user?.has_ess && (
          <button onClick={() => navigate('/portal')}
            className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-xl transition-all mb-1 ${collapsed ? 'justify-center' : ''}`}>
            <Home size={16} />
            {!collapsed && 'My Portal (ESS)'}
          </button>
        )}
        <button onClick={handleLogout}
          className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all ${collapsed ? 'justify-center' : ''}`}>
          <LogOut size={16} />
          {!collapsed && 'লগআউট'}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <TopModuleBar />
      <div className="flex flex-1 overflow-hidden">
        <aside className={`hidden lg:flex bg-white border-r border-gray-100 flex-col shadow-sm flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
          <SidebarContent />
        </aside>

        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside className="relative w-72 bg-white flex flex-col shadow-xl">
              <button onClick={() => setSidebarOpen(false)}
                className="absolute top-3 right-3 p-1.5 bg-gray-100 rounded-full z-10">
                <X size={18} />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl bg-gray-100">
              <Menu size={20} className="text-gray-600" />
            </button>
            <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-8" />
          </div>
          <main className="flex-1 overflow-y-auto page-enter">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function HrLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [openGroups, setOpenGroups] = useState({ leave: true, attendance: true, payroll: true });
  const location = useLocation();

  const toggleGroup = (key) => setOpenGroups(prev => ({ [key]: !prev[key] }));

  useEffect(() => {
    leaveApi.getMyApprovalQueue().then(r => setPendingLeaveCount((r.data || []).length)).catch(() => setPendingLeaveCount(0));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('লগআউট হয়েছে');
  };

  const navItems = MODULES.find(m => m.key === 'hr').sidebar;

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        {!collapsed && (
          <div>
            <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-10 mb-1" />
            <p className="text-xs text-gray-400">HR Module</p>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 bg-gray-100 rounded-lg text-gray-500 hover:bg-gray-200 hidden lg:flex items-center justify-center ml-auto">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.group) {
            const isOpen = openGroups[item.group];
            const Icon = item.icon;
            const anyActive = item.children.some(c => location.pathname === c.to || location.pathname.startsWith(c.to + '/'));
            return (
              <div key={item.group}>
                <button
                  onClick={() => toggleGroup(item.group)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${anyActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <><span className="flex-1 text-left" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                    <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} /></>}
                </button>
                {isOpen && !collapsed && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                    {item.children.map(({ to, icon: CIcon, label }) => (
                      <NavLink key={to} to={to}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all
                           ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <CIcon size={16} className="flex-shrink-0" />
                        <span className="flex-1">{label}</span>
                        {to === '/hr/leave-applications' && pendingLeaveCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {pendingLeaveCount}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          const { to, icon: Icon, label, end } = item;
          return (
            <NavLink key={to} to={to} end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                 ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'}`
              }>
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="flex-1">{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-primary-600 font-bold text-sm">{(user?.full_name || user?.phone)?.[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || user?.phone}</p>
              <p className="text-xs text-gray-400">{user?.role_label}</p>
            </div>
          </div>
        )}
        {user?.has_ess && (
          <button onClick={() => navigate('/portal')}
            className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-xl transition-all mb-1 ${collapsed ? 'justify-center' : ''}`}>
            <Home size={16} />
            {!collapsed && 'My Portal (ESS)'}
          </button>
        )}
        <button onClick={handleLogout}
          className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all ${collapsed ? 'justify-center' : ''}`}>
          <LogOut size={16} />
          {!collapsed && 'লগআউট'}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <TopModuleBar />
      <div className="flex flex-1 overflow-hidden">
        <aside className={`hidden lg:flex bg-white border-r border-gray-100 flex-col shadow-sm flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
          <SidebarContent />
        </aside>

        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside className="relative w-72 bg-white flex flex-col shadow-xl">
              <button onClick={() => setSidebarOpen(false)}
                className="absolute top-3 right-3 p-1.5 bg-gray-100 rounded-full z-10">
                <X size={18} />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl bg-gray-100">
              <Menu size={20} className="text-gray-600" />
            </button>
            <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-8" />
          </div>
          <main className="flex-1 overflow-y-auto page-enter">{children}</main>
        </div>
      </div>
    </div>
  );
}
// ── Unified sub-group renderer for nested nav items (HR: Leave, Attendance, Payroll) ──
function UnifiedSubGroup({ item, onClose, pendingCount }) {
  const location = useLocation();
  const isAnyActive = item.children.some(c => location.pathname === c.to || location.pathname.startsWith(c.to + '/'));
  const [open, setOpen] = useState(isAnyActive);
  const Icon = item.icon;
  return (
    <div>
      <button onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all
          ${isAnyActive ? 'text-primary-600 bg-primary-50' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
        <Icon size={13} className="flex-shrink-0" />
        <span className="flex-1 text-left" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
        <ChevronDown size={11} className={`transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-0.5 ml-3 pl-2 border-l border-gray-100 space-y-0.5">
          {item.children.map(child => {
            const CIcon = child.icon;
            return (
              <NavLink key={child.to} to={child.to} onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                   ${isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
                <CIcon size={12} className="flex-shrink-0" />
                <span className="flex-1" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{child.label}</span>
                {child.to === '/hr/leave-applications' && pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center">
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

function buildModuleList(user) {
  const moduleAccess = (user.module_access || []).map(a => a.module_key);
  const list = [];

  // Profile route depends on role
  const profileRoute = user.role === 'manager' ? '/manager/profile'
    : user.role_level <= 2 ? '/admin/profile'
    : user.role_level >= 4 && user.role !== 'employee' ? '/executive/profile'
    : '/portal/profile';

  if (user.role !== 'employee' && user.role !== 'super_admin') {
    const base = user.role === 'manager' ? '/manager' : user.role_level <= 2 ? '/admin' : '/executive';
    let items;
    if (user.role_level >= 4) {
      items = [
        { to: base, icon: BarChart2, label: 'ড্যাশবোর্ড', end: true },
        { to: `${base}/new-sale`, icon: Plus, label: 'নতুন সেল' },
        { to: `${base}/approvals`, icon: CheckSquare, label: 'Pending' },
        { to: `${base}/performance`, icon: TrendingUp, label: 'পারফরম্যান্স' },
        { to: `${base}/due`, icon: Clock, label: 'বকেয়া' },
      ];
    } else if (user.role === 'manager') {
      items = [
        { to: base, icon: BarChart2, label: 'ড্যাশবোর্ড', end: true },
        { to: `${base}/approvals`, icon: CheckSquare, label: 'সেল Approval' },
        { to: `${base}/new-sale`, icon: Plus, label: 'নতুন সেল' },
        { to: `${base}/sales`, icon: BarChart2, label: 'সেলস রিপোর্ট' },
        { to: `${base}/due`, icon: Clock, label: 'বকেয়া তালিকা' },
        { to: `${base}/performance`, icon: TrendingUp, label: 'পারফরম্যান্স' },
      ];
    } else if (user.role === 'advisor') {
      items = [
        { to: base, icon: BarChart2, label: 'ড্যাশবোর্ড', end: true },
        { to: `${base}/approvals`, icon: CheckSquare, label: 'সেল Approval' },
        { to: `${base}/new-sale`, icon: Plus, label: 'নতুন সেল' },
        { to: `${base}/sales`, icon: BarChart2, label: 'সেলস রিপোর্ট' },
        { to: `${base}/due`, icon: Clock, label: 'বকেয়া তালিকা' },
        { to: `${base}/courses`, icon: BookOpen, label: 'কোর্স ম্যানেজমেন্ট' },
      ];
    } else {
      items = [
        { to: base, icon: BarChart2, label: 'ড্যাশবোর্ড', end: true },
        { to: `${base}/approvals`, icon: CheckSquare, label: 'সেল Approval' },
        { to: `${base}/new-sale`, icon: Plus, label: 'নতুন সেল' },
        { to: `${base}/sales`, icon: BarChart2, label: 'সেলস রিপোর্ট' },
        { to: `${base}/due`, icon: Clock, label: 'বকেয়া তালিকা' },
      ];
    }
    list.push({ key: 'crm', label: 'CRM', icon: BarChart2, basePath: base, items });
  }

  if (moduleAccess.includes('hr')) {
    list.push({ key: 'hr', label: 'HR', icon: Users, basePath: '/hr', items: MODULES.find(m => m.key === 'hr')?.sidebar || [] });
  }

  if (moduleAccess.includes('accounting')) {
    list.push({ key: 'accounting', label: 'Accounting', icon: Wallet, basePath: '/accounting', items: MODULES.find(m => m.key === 'accounting')?.sidebar || [] });
  }

  // My Office — সবার জন্য (ESS থাকলে অতিরিক্ত items)
  const myOfficeItems = [
    ...(user.has_ess ? [
      { to: '/portal', icon: Home, label: 'আজকের Attendance', end: true },
      { to: '/portal/attendance', icon: Clock, label: 'Attendance Report' },
      { to: '/portal/leave', icon: Calendar, label: 'Leave' },
      { to: '/portal/approvals', icon: CheckSquare, label: 'Approvals' },
      { to: '/portal/notices', icon: BookText, label: 'Notice Board' },
    ] : []),
    { to: profileRoute, icon: User, label: 'আমার প্রোফাইল' },
  ];
  const myOfficeBasePath = user.has_ess ? '/portal' : profileRoute;
  list.push({ key: 'ess', label: 'My Office', icon: Briefcase, basePath: myOfficeBasePath, items: myOfficeItems });

  return list;
}

export function UnifiedLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openModules, setOpenModules] = useState({});
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [pendingDueCount, setPendingDueCount] = useState(0);
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);

  const moduleList = useMemo(() => user && user.role !== 'super_admin' ? buildModuleList(user) : [], [user]);

  const activeModuleKey = useMemo(() => {
    return moduleList.find(m => location.pathname === m.basePath || location.pathname.startsWith(m.basePath + '/'))?.key;
  }, [location.pathname, moduleList]);

  useEffect(() => {
    if (activeModuleKey) setOpenModules(prev => ({ ...prev, [activeModuleKey]: true }));
  }, [activeModuleKey]);

  useEffect(() => {
    if (moduleList.some(m => m.key === 'hr')) {
      leaveApi.getMyApprovalQueue().then(r => setPendingLeaveCount((r.data || []).length)).catch(() => {});
    }
    approvalsApi.getPending().then(r => setPendingApprovalCount((r.data || []).length)).catch(() => {});
    approvalsApi.getPendingDue().then(r => setPendingDueCount((r.data || []).length)).catch(() => {});
    if (user?.has_ess) {
      hrApi.getNotices().then(r => {
        const notices = r.data || [];
        const lastSeen = localStorage.getItem('notices_last_seen');
        const unread = lastSeen ? notices.filter(n => new Date(n.created_at) > new Date(lastSeen)).length : notices.length;
        setUnreadNoticeCount(unread);
      }).catch(() => {});
    }
  }, [moduleList, user?.has_ess]);

  if (user?.role === 'super_admin') return <AdminLayout>{children}</AdminLayout>;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('লগআউট হয়েছে');
  };

  const SidebarNav = ({ onClose }) => (
    <>
      <div className="p-4 border-b border-gray-100">
        <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-9 mb-1" />
        <p className="text-xs text-gray-400">{user?.role_label}</p>
      </div>
      <nav className="flex-1 p-2.5 overflow-y-auto space-y-0.5">
        {moduleList.map(mod => {
          const ModIcon = mod.icon;
          const isOpen = !!openModules[mod.key];
          const isActive = mod.key === activeModuleKey;
          return (
            <div key={mod.key}>
              <button onClick={() => setOpenModules(prev => ({ [mod.key]: !prev[mod.key] }))}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'}`}>
                <ModIcon size={17} className="flex-shrink-0" />
                <span className="flex-1 text-left" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mod.label}</span>
                <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="mt-1 ml-3 pl-3 border-l-2 border-gray-100 space-y-0.5 mb-1">
                  {mod.items.map(item => {
                    if (item.group) {
                      return <UnifiedSubGroup key={item.group} item={item} onClose={onClose} pendingCount={pendingLeaveCount} />;
                    }
                    const ItemIcon = item.icon;
                    const badge = item.to.includes('/approvals') ? pendingApprovalCount : item.to.includes('/due') ? pendingDueCount : item.to.includes('/notices') ? unreadNoticeCount : 0;
                    return (
                      <NavLink key={item.to} to={item.to} end={item.end} onClick={onClose}
                        className={({ isActive: ia }) =>
                          `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                           ${ia ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
                        <ItemIcon size={14} className="flex-shrink-0" />
                        <span className="flex-1" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                        {badge > 0 && <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center flex-shrink-0">{badge}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-2 py-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {(user?.full_name || user?.phone)?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 truncate">{user?.full_name || user?.phone}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-xl transition-all">
          <LogOut size={14} /> লগআউট
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="hidden lg:flex w-56 bg-white border-r border-gray-100 flex-col shadow-sm flex-shrink-0">
        <SidebarNav onClose={() => {}} />
      </aside>
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-white flex flex-col shadow-xl z-10">
            <button onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 p-1.5 bg-gray-100 rounded-full z-10">
              <X size={16} />
            </button>
            <SidebarNav onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl bg-gray-100">
            <Menu size={20} className="text-gray-600" />
          </button>
          <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-7" />
        </div>
        <main className="flex-1 overflow-y-auto page-enter">{children}</main>
      </div>
    </div>
  );
}
