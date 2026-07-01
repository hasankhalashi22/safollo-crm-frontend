import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, UserX, Clock, ChevronRight, CalendarDays, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, startOfWeek, addDays, isToday, parseISO, isSameDay } from 'date-fns';
import { hrApi, leaveApi, attendanceApi } from '../../api/client';

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
  const [employees, setEmployees] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [weekAttendance, setWeekAttendance] = useState([]);
  const [onLeaveToday, setOnLeaveToday] = useState([]);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [holidays, setHolidays] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');
    const year = new Date().getFullYear();

    Promise.all([
      hrApi.getEmployees(),
      attendanceApi.getAll({ date: today }),
      attendanceApi.getAll({ dateFrom: weekStart, dateTo: today }),
      leaveApi.getAllApplications('approved'),
      leaveApi.getAllApplications('pending'),
      hrApi.getHolidays(year),
      hrApi.getNotices(),
    ]).then(([emp, todayAtt, weekAtt, approvedLeaves, pendingLeaves, hols, nots]) => {
      setEmployees(emp.data || []);
      setTodayAttendance(todayAtt.data || []);
      setWeekAttendance(weekAtt.data || []);

      const todayStr = new Date().toISOString().split('T')[0];
      const onLeave = (approvedLeaves.data || []).filter(l =>
        l.start_date <= todayStr && l.end_date >= todayStr
      );
      setOnLeaveToday(onLeave);
      setPendingLeaveCount((pendingLeaves.data || []).length);
      setHolidays(hols.data || []);
      setNotices((nots.data || []).slice(0, 3));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const weekChartData = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = weekAttendance.filter(a => a.date === dayStr || (a.check_in_time && a.check_in_time.startsWith(dayStr))).length;
      return { day: format(day, 'EEE'), count };
    });
  }, [weekAttendance]);

  const upcomingHolidays = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return holidays
      .filter(h => h.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
  }, [holidays]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-40">
        <p className="text-gray-400">লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-dark">HR Dashboard</h1>
        <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={Users} label="মোট কর্মী" value={employees.length} color="bg-primary-500" />
        <SummaryCard icon={UserCheck} label="আজ উপস্থিত" value={todayAttendance.length} color="bg-green-500" />
        <SummaryCard icon={UserX} label="আজ ছুটিতে" value={onLeaveToday.length} color="bg-orange-400" />
        <SummaryCard icon={Clock} label="পেন্ডিং লিভ" value={pendingLeaveCount} color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Attendance Chart */}
        <div className="card lg:col-span-2">
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
        {notices.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">কোনো নোটিশ নেই</p>
        ) : (
          <div className="space-y-2.5">
            {notices.map(n => {
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
