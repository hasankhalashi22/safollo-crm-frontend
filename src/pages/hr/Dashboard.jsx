import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, UserX, Clock, ChevronRight, CalendarDays, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, startOfWeek, addDays, isToday, parseISO } from 'date-fns';
import { hrApi } from '../../api/client';

const CATEGORY_LABELS = {
  urgent: { label: 'জরুরি', cls: 'bg-red-50 text-red-600' },
  general: { label: 'সাধারণ', cls: 'bg-blue-50 text-blue-600' },
  event: { label: 'ইভেন্ট', cls: 'bg-green-50 text-green-600' },
};

function SummaryCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-dark">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function HrDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    hrApi.getDashboardStats()
      .then(r => setStats(r.data))
      .catch(err => setError(err?.message || 'লোড করা যায়নি'))
      .finally(() => setLoading(false));
  }, []);

  const weekChartData = useMemo(() => {
    if (!stats) return [];
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const row = (stats.week_attendance || []).find(r => r.date === dayStr);
      return { day: format(day, 'EEE'), count: row ? parseInt(row.count) : 0 };
    });
  }, [stats]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-40">
        <p className="text-gray-400">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500 text-sm">ড্যাশবোর্ড লোড করা যায়নি: {error}</p>
      </div>
    );
  }

  const upcomingHolidays = stats?.upcoming_holidays || [];
  const recentNotices = stats?.recent_notices || [];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-dark">HR Dashboard</h1>
        <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard icon={Users} label="মোট কর্মী" value={stats?.total_employees ?? 0} color="bg-primary-500" />
        <SummaryCard icon={UserCheck} label="আজ উপস্থিত" value={stats?.today_present ?? 0} color="bg-green-500" />
        <SummaryCard icon={UserX} label="আজ ছুটিতে" value={stats?.on_leave_today ?? 0} color="bg-orange-400" />
        <SummaryCard icon={Clock} label="পেন্ডিং লিভ" value={stats?.pending_leave ?? 0} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Weekly Attendance Chart */}
        <div className="card xl:col-span-2">
          <h2 className="text-sm font-semibold text-dark mb-4">এই সপ্তাহের উপস্থিতি</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekChartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                formatter={(v) => [v, 'উপস্থিত']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming Holidays */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-dark">আসন্ন ছুটির দিন</h2>
            <CalendarDays size={16} className="text-gray-400" />
          </div>
          {upcomingHolidays.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">কোনো ছুটি নেই</p>
          ) : (
            <div className="space-y-2.5">
              {upcomingHolidays.map(h => {
                const d = parseISO(h.date);
                const todayFlag = isToday(d);
                return (
                  <div key={h.id} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${todayFlag ? 'bg-primary-500 text-white' : 'bg-gray-100 text-dark'}`}>
                      <span className="text-[10px] leading-tight font-medium">{format(d, 'MMM')}</span>
                      <span className="text-sm font-bold leading-tight">{format(d, 'dd')}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-dark truncate">{h.name}</p>
                      <p className="text-[10px] text-gray-400">{format(d, 'EEEE')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Notices */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-dark">সাম্প্রতিক নোটিশ</h2>
          </div>
          <Link to="/hr/notices" className="flex items-center gap-1 text-xs text-primary-600 font-medium">
            সব দেখুন <ChevronRight size={14} />
          </Link>
        </div>
        {recentNotices.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">কোনো নোটিশ নেই</p>
        ) : (
          <div className="space-y-2.5">
            {recentNotices.map(n => {
              const cat = CATEGORY_LABELS[n.category] || CATEGORY_LABELS.general;
              return (
                <div key={n.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md mt-0.5 flex-shrink-0 ${cat.cls}`}>{cat.label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-dark truncate">{n.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{format(parseISO(n.created_at), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
