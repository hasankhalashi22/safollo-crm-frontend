import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getVisibleModules } from '../../config/modules';
import { useState, useEffect } from 'react';
import { Home, Calendar, Clock, User, LogOut, Bell, CheckSquare } from 'lucide-react';
import { leaveApi } from '../../api/client';

const portalNavItems = [
  { to: '/portal', icon: Home, label: 'Home', end: true },
  { to: '/portal/attendance', icon: Clock, label: 'Attendance' },
  { to: '/portal/leave', icon: Calendar, label: 'Leave' },
  { to: '/portal/approvals', icon: CheckSquare, label: 'Approvals' },
  { to: '/portal/profile', icon: User, label: 'Profile' },
];

export default function PortalLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const visibleModules = getVisibleModules(user);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div>
          <p className="font-semibold text-sm">{user?.full_name || user?.phone}</p>
          <p className="text-primary-200 text-xs">Employee Portal</p>
        </div>
        <button onClick={handleLogout} className="p-2 bg-primary-500 rounded-full">
          <LogOut size={16} />
        </button>
      </header>

      {visibleModules.length > 0 && (
        <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto">
          {visibleModules.map(m => (
            <button key={m.key} onClick={() => navigate(m.basePath)}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium whitespace-nowrap">
              {m.label} মডিউলে যান →
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2 z-30">
        {portalNavItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}