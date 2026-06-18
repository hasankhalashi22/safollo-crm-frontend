import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Home, Plus, Clock, User, BarChart2, Users, BookOpen, Settings, LogOut, TrendingUp, Shield, Menu, X, Activity, CheckSquare, Wallet, FileText, BookText, Landmark, CreditCard } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MODULES, getModuleForPath, getVisibleModules } from '../../config/modules';


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
            <CheckSquare size={20} />
            <span className="text-xs">Pending</span>
          </NavLink>

          <NavLink to="/executive/performance" className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${isActive ? 'text-primary-500' : 'text-gray-400'}`}>
            <TrendingUp size={20} />
            <span className="text-xs">পারফরম্যান্স</span>
          </NavLink>

          <NavLink to="/executive/due" className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${isActive ? 'text-primary-500' : 'text-gray-400'}`}>
            <Clock size={20} />
            <span className="text-xs">বকেয়া</span>
          </NavLink>

          <NavLink to="/executive/profile" className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${isActive ? 'text-primary-500' : 'text-gray-400'}`}>
            <User size={20} />
            <span className="text-xs">প্রোফাইল</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}

export function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('লগআউট হয়েছে');
  };

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
    { to: '/admin/staff', icon: Users, label: 'স্টাফ ম্যানেজমেন্ট' },
    { to: '/admin/roles', icon: Shield, label: 'Role Management' },
    { to: '/admin/courses', icon: BookOpen, label: 'কোর্স ম্যানেজমেন্ট' },
    { to: '/admin/settings', icon: Settings, label: 'সেটিংস' },
    { to: '/admin/profile', icon: User, label: 'আমার প্রোফাইল' },
    ...(isSuperAdmin ? [{ to: '/admin/audit', icon: Activity, label: 'Activity Log' }] : []),
  ];

  const navItems = isManager ? managerNav : adminNav;

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-gray-100">
        <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-10 mb-1" />
        <p className="text-xs text-gray-400">{user?.role_label}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
               ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'}`
            }>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-600 font-bold text-sm">
              {(user?.full_name || user?.phone)?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.full_name || user?.phone}</p>
            <p className="text-xs text-gray-400">{user?.role_label}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all">
          <LogOut size={16} />
          লগআউট
        </button>
      </div>
    </>
  );

 return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <TopModuleBar />
      <div className="flex flex-1 overflow-hidden">
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-100 flex-col shadow-sm flex-shrink-0">
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

       <main className="flex-1 overflow-y-auto page-enter">
          {children}
        </main>
      </div>
      </div>
    </div>
  );
}

export function AccountingLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('লগআউট হয়েছে');
  };

 const navItems = MODULES.find(m => m.key === 'accounting').sidebar;

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-gray-100">
        <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-10 mb-1" />
      <p className="text-xs text-gray-400">Accounting Module</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
               ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'}`
            }>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-600 font-bold text-sm">
              {(user?.full_name || user?.phone)?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.full_name || user?.phone}</p>
            <p className="text-xs text-gray-400">{user?.role_label}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all">
          <LogOut size={16} />
          লগআউট
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <TopModuleBar />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:flex w-64 bg-white border-r border-gray-100 flex-col shadow-sm flex-shrink-0">
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

          <main className="flex-1 overflow-y-auto page-enter">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function HrLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('লগআউট হয়েছে');
  };

const navItems = MODULES.find(m => m.key === 'hr').sidebar;

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-gray-100">
        <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-10 mb-1" />
        <p className="text-xs text-gray-400">HR Module</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
               ${isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'}`
            }>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-600 font-bold text-sm">
              {(user?.full_name || user?.phone)?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.full_name || user?.phone}</p>
            <p className="text-xs text-gray-400">{user?.role_label}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all">
          <LogOut size={16} />
          লগআউট
        </button>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <TopModuleBar />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden lg:flex w-64 bg-white border-r border-gray-100 flex-col shadow-sm flex-shrink-0">
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

          <main className="flex-1 overflow-y-auto page-enter">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}