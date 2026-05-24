import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Home, Plus, Clock, User, BarChart2, Users, BookOpen, Settings, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

// Executive bottom nav
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
      {/* Top bar */}
      <div className="bg-primary-500 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div>
          <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-8 brightness-0 invert" />
          <p className="text-primary-200 text-xs">{user?.full_name || user?.phone}</p>
        </div>
        <button onClick={handleLogout} className="p-2 rounded-xl bg-primary-600 active:scale-95">
          <LogOut size={18} />
        </button>
      </div>

      {/* Content */}
      <main className="page-enter">{children}</main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-10">
        <div className="flex items-center justify-around px-2 py-2">
          <NavLink to="/executive" end className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${isActive ? 'text-primary-500' : 'text-gray-400'}`
          }>
            <Home size={20} />
            <span className="text-xs">হোম</span>
          </NavLink>

          <NavLink to="/executive/new-sale" className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${isActive ? 'text-primary-500' : 'text-gray-400'}`
          }>
            <div className="bg-primary-500 text-white rounded-full p-2.5 -mt-6 shadow-lg">
              <Plus size={22} />
            </div>
            <span className="text-xs text-gray-400 mt-0.5">নতুন সেল</span>
          </NavLink>

          <NavLink to="/executive/due" className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${isActive ? 'text-primary-500' : 'text-gray-400'}`
          }>
            <Clock size={20} />
            <span className="text-xs">বকেয়া</span>
          </NavLink>

          <NavLink to="/executive/profile" className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${isActive ? 'text-primary-500' : 'text-gray-400'}`
          }>
            <User size={20} />
            <span className="text-xs">প্রোফাইল</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}

// Admin sidebar layout
export function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('লগআউট হয়েছে');
  };

  const isManager = user?.role === 'manager';
 const navItems = isManager ? [
    { to: '/manager', icon: BarChart2, label: 'ড্যাশবোর্ড', end: true },
    { to: '/manager/new-sale', icon: Plus, label: 'নতুন সেল' },
    { to: '/manager/sales', icon: BarChart2, label: 'সেলস রিপোর্ট' },
    { to: '/manager/due', icon: Clock, label: 'বকেয়া তালিকা' },
  ] :
  ] : [
    { to: '/admin', icon: BarChart2, label: 'ড্যাশবোর্ড', end: true },
    { to: '/admin/sales', icon: Plus, label: 'সেলস রিপোর্ট' },
    { to: '/admin/due', icon: Clock, label: 'বকেয়া তালিকা' },
    { to: '/admin/staff', icon: Users, label: 'স্টাফ ম্যানেজমেন্ট' },
    { to: '/admin/courses', icon: BookOpen, label: 'কোর্স ম্যানেজমেন্ট' },
    { to: '/admin/settings', icon: Settings, label: 'সেটিংস' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm">
       <div className="p-4 border-b border-gray-100">
  <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-10 mb-1" />
  <p className="text-xs text-gray-400">{user?.role_label}</p>
</div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) =>
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
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
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
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto page-enter">
        {children}
      </main>
    </div>
  );
}
