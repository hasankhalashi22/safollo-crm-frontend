import { useState, useEffect } from 'react';
import { reportsApi } from '../../api/client';
import { TrendingUp, Users, Clock, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([reportsApi.overview(), reportsApi.monthly()]).then(([oRes, mRes]) => {
      setOverview(oRes.data);
      setMonthly(mRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner w-8 h-8" />
    </div>
  );

  const t = overview?.totals || {};
  const today = overview?.today || {};

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-dark">ড্যাশবোর্ড</h1>
        <p className="text-gray-500 text-sm mt-1">সাফল্য একাডেমি CRM Overview</p>
      </div>

      {/* Today stats */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">আজকের সারসংক্ষেপ</h2>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={<TrendingUp size={20} className="text-primary-500" />} label="আজকের সংগ্রহ" value={`৳${Number(today.today_collected || 0).toLocaleString()}`} bg="bg-primary-50" />
          <StatCard icon={<Users size={20} className="text-blue-500" />} label="আজকের লেনদেন" value={today.today_transactions || '০'} bg="bg-blue-50" />
          <StatCard icon={<TrendingUp size={20} className="text-green-500" />} label="মোট রেভিনিউ" value={`৳${Number(t.total_revenue || 0).toLocaleString()}`} bg="bg-green-50" />
          <StatCard icon={<Clock size={20} className="text-red-500" />} label="মোট বকেয়া" value={`৳${Number(t.total_due || 0).toLocaleString()}`} bg="bg-red-50" />
        </div>
      </div>

      {/* Overall stats */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">সামগ্রিক পরিসংখ্যান</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-dark">{t.total_students || '০'}</p>
            <p className="text-sm text-gray-500 mt-1">মোট এনরোলমেন্ট</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-green-600">{t.paid_students || '০'}</p>
            <p className="text-sm text-gray-500 mt-1">পেইড</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-red-500">{t.due_students || '০'}</p>
            <p className="text-sm text-gray-500 mt-1">বকেয়া</p>
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      {monthly?.daily_breakdown?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-dark mb-4">এই মাসের দৈনিক সংগ্রহ</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly.daily_breakdown}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d ? new Date(d).getDate() + '/' + (new Date(d).getMonth()+1) : ''} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `৳${v/1000}k`} />
              <Tooltip formatter={v => [`৳${Number(v).toLocaleString()}`, 'সংগ্রহ']} />
              <Bar dataKey="collected" fill="#1A7A6E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Course stats */}
      {overview?.course_stats?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-dark mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-primary-500" /> কোর্সভিত্তিক এনরোলমেন্ট
          </h2>
          <div className="space-y-3">
            {overview.course_stats.map((c, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{c.course_name}</span>
                  <span className="text-gray-500">{c.total_enrollments} জন</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full"
                    style={{ width: `${Math.min(100, (c.paid / c.total_enrollments) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>পেইড: {c.paid}</span>
                  <span>বকেয়া: {c.due}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executive leaderboard */}
      {monthly?.leaderboard?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-dark mb-4">এই মাসের লিডারবোর্ড</h2>
          <div className="space-y-2">
            {monthly.leaderboard.map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
                  ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : 'bg-orange-300 text-white'}`}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{e.full_name || e.phone}</p>
                  <p className="text-xs text-gray-400">{e.sales_count}টি সেল</p>
                </div>
                <span className="font-bold text-primary-600">৳{Number(e.total_collected).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, bg }) {
  return (
    <div className={`${bg} rounded-2xl p-4`}>
      <div className="mb-2">{icon}</div>
      <p className="text-2xl font-bold text-dark">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
