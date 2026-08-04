import { useState, useEffect } from 'react';
import { reportsApi } from '../../api/client';
import { BookOpen } from 'lucide-react';
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

  const fmtMoney = (n) => `৳${Number(n || 0).toLocaleString('en-US')}`;
  const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold text-dark">ড্যাশবোর্ড</h1>
        <p className="text-gray-500 text-sm mt-0.5">সাফল্য একাডেমি CRM Overview</p>
      </div>

      {/* Mobile: stacked 2-col */}
      <div className="md:hidden space-y-3">
        <div className="rounded-2xl p-4 flex flex-col items-center justify-center text-center" style={{ background: '#1A7A6E', minHeight: '90px' }}>
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>আজকের সংগ্রহ</p>
          <p className="text-2xl font-bold text-white">{fmtMoney(today.today_collected)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 bg-white border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">আজকের লেনদেন</p>
            <p className="text-2xl font-bold text-dark">{fmtNum(today.today_transactions)}</p>
          </div>
          <div className="rounded-2xl p-4 bg-white border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">এই মাসের রেভিনিউ</p>
            <p className="text-2xl font-bold text-dark">{fmtMoney(monthly?.summary?.total_collected)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4" style={{ background: '#EEF2FF' }}>
            <p className="text-xs mb-1" style={{ color: '#6366f1' }}>মোট রেভিনিউ</p>
            <p className="text-2xl font-bold" style={{ color: '#4338ca' }}>{fmtMoney(t.total_revenue)}</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: '#FFF1F2' }}>
            <p className="text-xs mb-1" style={{ color: '#f43f5e' }}>মোট বকেয়া</p>
            <p className="text-2xl font-bold" style={{ color: '#be123c' }}>{fmtMoney(t.total_due)}</p>
          </div>
        </div>
      </div>

      {/* Desktop: row 1 — 2 boxes */}
      <div className="hidden md:grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 flex flex-col items-center justify-center text-center" style={{ background: '#1A7A6E', minHeight: '100px' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
            </svg>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>আজকের সংগ্রহ</p>
          </div>
          <p className="text-2xl font-bold text-white">{fmtMoney(today.today_collected)}</p>
        </div>
        <div className="rounded-2xl p-4 bg-white border border-gray-100 flex flex-col justify-center">
          <p className="text-xs text-gray-400 mb-1">এই মাসের রেভিনিউ</p>
          <p className="text-2xl font-bold text-dark">{fmtMoney(monthly?.summary?.total_collected)}</p>
        </div>
      </div>

      {/* Desktop: row 2 — 3 boxes */}
      <div className="hidden md:grid grid-cols-3 gap-3">
        <div className="rounded-2xl p-4 bg-white border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">আজকের লেনদেন</p>
          <p className="text-2xl font-bold text-dark">{fmtNum(today.today_transactions)}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: '#EEF2FF' }}>
          <p className="text-xs mb-1" style={{ color: '#6366f1' }}>মোট রেভিনিউ</p>
          <p className="text-2xl font-bold" style={{ color: '#4338ca' }}>{fmtMoney(t.total_revenue)}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: '#FFF1F2' }}>
          <p className="text-xs mb-1" style={{ color: '#f43f5e' }}>মোট বকেয়া</p>
          <p className="text-2xl font-bold" style={{ color: '#be123c' }}>{fmtMoney(t.total_due)}</p>
        </div>
      </div>

      {/* সামগ্রিক পরিসংখ্যান */}
      <div>
        <h2 className="text-base font-bold text-dark mb-3">সামগ্রিক পরিসংখ্যান</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl p-4" style={{ background: '#F0FDF4' }}>
            <div className="mb-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <p className="text-2xl font-bold text-dark">{fmtNum(t.total_students)}</p>
            <p className="text-xs text-gray-400 mt-0.5">মোট এনরোলমেন্ট</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: '#F0FDF4' }}>
            <div className="mb-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#16a34a' }}>{fmtNum(t.paid_students)}</p>
            <p className="text-xs text-gray-400 mt-0.5">মোট পেইড</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: '#FFF7ED' }}>
            <div className="mb-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#ea580c' }}>{fmtNum(t.due_students)}</p>
            <p className="text-xs text-gray-400 mt-0.5">মোট বকেয়া (শিক্ষার্থী)</p>
          </div>
        </div>
      </div>

      {/* Chart + Leaderboard — side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {monthly?.daily_breakdown?.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-dark mb-4">এই মাসের দৈনিক সংগ্রহ</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly.daily_breakdown}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d ? new Date(d).getDate() + '/' + (new Date(d).getMonth()+1) : ''} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `৳${v/1000}k`} />
                <Tooltip formatter={v => [`৳${Number(v).toLocaleString('en-US')}`, 'সংগ্রহ']} />
                <Bar dataKey="collected" fill="#1A7A6E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {monthly?.leaderboard?.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-dark mb-4">এই মাসের লিডারবোর্ড</h2>
            <div className="space-y-2">
              {monthly.leaderboard.map((e, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                    ${i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : 'bg-orange-300 text-white'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{e.full_name || e.phone}</p>
                    <p className="text-xs text-gray-400">{e.sales_count}টি সেল</p>
                  </div>
                  <span className="font-bold text-primary-600 flex-shrink-0">৳{Number(e.total_collected).toLocaleString('en-US')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Course stats — full width */}
      {overview?.course_stats?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-dark mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-primary-500" /> কোর্সভিত্তিক এনরোলমেন্ট
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
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
    </div>
  );
}
