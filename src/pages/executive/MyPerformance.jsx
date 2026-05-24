import { useState, useEffect } from 'react';
import { reportsApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { TrendingUp, CheckCircle, Clock, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

export default function MyPerformance() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('month'); // 'month' | 'alltime'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchData = () => {
    setLoading(true);
console.log('Token:', localStorage.getItem('crm_token'));
    reportsApi.myPerformance({ month: selectedMonth, year: selectedYear }).then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [selectedMonth, selectedYear]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner w-8 h-8" />
    </div>
  );

  const monthData = data?.this_month;
  const allData = data?.all_time;
  const courseData = tab === 'month' ? data?.course_this_month : data?.course_all_time;
  const trendData = data?.monthly_trend?.map(t => ({
    name: MONTHS[t.month - 1]?.slice(0, 3),
    সংগ্রহ: Number(t.collected),
    ভর্তি: Number(t.enrollments),
  }));

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h2 className="text-xl font-display font-bold text-dark">আমার পারফরম্যান্স</h2>
        <p className="text-gray-500 text-sm">{user?.full_name || user?.phone}</p>
      </div>

      {/* Tab */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button onClick={() => setTab('month')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'month' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}>
          এই মাস
        </button>
        <button onClick={() => setTab('alltime')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === 'alltime' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}>
          সর্বমোট
        </button>
      </div>

      {/* Month selector */}
      {tab === 'month' && (
        <div className="flex gap-2">
          <select className="input-field" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="input-field" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {tab === 'month' ? (
          <>
            <StatCard icon={<TrendingUp size={18} className="text-primary-500" />} label="মোট সংগ্রহ" value={`৳${Number(monthData?.total_collected || 0).toLocaleString()}`} bg="bg-primary-50" />
            <StatCard icon={<CheckCircle size={18} className="text-green-500" />} label="মোট ভর্তি" value={monthData?.total_enrollments || '০'} bg="bg-green-50" />
            <StatCard icon={<CheckCircle size={18} className="text-blue-500" />} label="পেইড" value={monthData?.paid_count || '০'} bg="bg-blue-50" />
            <StatCard icon={<Clock size={18} className="text-red-500" />} label="বকেয়া" value={monthData?.due_count || '০'} bg="bg-red-50" />
          </>
        ) : (
          <>
            <StatCard icon={<TrendingUp size={18} className="text-primary-500" />} label="মোট সংগ্রহ" value={`৳${Number(allData?.total_collected || 0).toLocaleString()}`} bg="bg-primary-50" />
            <StatCard icon={<CheckCircle size={18} className="text-green-500" />} label="মোট ভর্তি" value={allData?.total_enrollments || '০'} bg="bg-green-50" />
            <StatCard icon={<CheckCircle size={18} className="text-blue-500" />} label="পেইড" value={allData?.paid_count || '০'} bg="bg-blue-50" />
            <StatCard icon={<Clock size={18} className="text-red-500" />} label="বকেয়া" value={`৳${Number(allData?.total_due || 0).toLocaleString()}`} bg="bg-red-50" />
          </>
        )}
      </div>

      {/* Course breakdown */}
      {courseData?.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-primary-500" />
            <h3 className="font-semibold text-dark">কোর্সওয়াইজ</h3>
          </div>
          <div className="space-y-2">
            {courseData.map((c, i) => (
              <div key={i} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-sm">{c.course_name}</p>
                  <p className="text-xs text-gray-400">{c.enrollments}টি ভর্তি</p>
                </div>
                <span className="font-bold text-primary-600">৳{Number(c.collected).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend chart */}
      {trendData?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-dark mb-3">গত ৬ মাসের ট্রেন্ড</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trendData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `৳${v/1000}k`} />
              <Tooltip formatter={v => [`৳${Number(v).toLocaleString()}`, 'সংগ্রহ']} />
              <Bar dataKey="সংগ্রহ" fill="#1A7A6E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, bg }) {
  return (
    <div className={`${bg} rounded-2xl p-3.5`}>
      <div className="mb-2">{icon}</div>
      <p className="text-xl font-bold text-dark">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
