import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ExecutiveDashboard() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    reportsApi.daily().then(res => {
      setReport(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner w-8 h-8" />
    </div>
  );

  const summary = report?.summary;

  return (
    <div className="p-4 space-y-4">
      {/* Greeting */}
      <div className="pt-2">
        <p className="text-gray-500 text-sm">{format(new Date(), 'dd MMMM yyyy')}</p>
        <h2 className="text-xl font-display font-bold text-dark">
          আস্সালামু আলাইকুম, {user?.full_name?.split(' ')[0] || 'ভাই'} 👋
        </h2>
      </div>

      {/* Today's stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<TrendingUp size={20} className="text-primary-500" />}
          label="আজকের সংগ্রহ"
          value={`৳${Number(summary?.total_collected || 0).toLocaleString('bn-BD')}`}
          bg="bg-primary-50"
        />
        <StatCard
          icon={<CheckCircle size={20} className="text-green-500" />}
          label="নতুন ভর্তি"
          value={summary?.new_enrollments || '০'}
          bg="bg-green-50"
        />
        <StatCard
          icon={<TrendingUp size={20} className="text-blue-500" />}
          label="মোট লেনদেন"
          value={summary?.total_transactions || '০'}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<CheckCircle size={20} className="text-accent" />}
          label="বকেয়া পরিশোধ"
          value={summary?.due_cleared || '০'}
          bg="bg-orange-50"
        />
      </div>

      {/* Quick actions */}
      <div className="card">
        <h3 className="font-semibold text-dark mb-3">দ্রুত কাজ</h3>
        <div className="space-y-2">
          <button
            onClick={() => navigate('/executive/new-sale')}
            className="w-full flex items-center gap-3 p-3 bg-primary-500 text-white rounded-xl active:scale-95 transition-all"
          >
            <div className="w-8 h-8 bg-primary-400 rounded-lg flex items-center justify-center">
              <span className="text-lg">+</span>
            </div>
            <span className="font-medium">নতুন সেল যোগ করুন</span>
          </button>
          <button
            onClick={() => navigate('/executive/due')}
            className="w-full flex items-center gap-3 p-3 bg-red-50 text-red-600 rounded-xl active:scale-95 transition-all"
          >
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <Clock size={16} className="text-red-500" />
            </div>
            <span className="font-medium">বকেয়া তালিকা দেখুন</span>
          </button>
        </div>
      </div>

      {/* Upcoming dues */}
      {report?.upcoming_dues?.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={18} className="text-red-500" />
            <h3 className="font-semibold text-dark">আসন্ন বকেয়া</h3>
          </div>
          <div className="space-y-2">
            {report.upcoming_dues.slice(0, 3).map((due, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-red-50 rounded-xl">
                <div>
                  <p className="font-medium text-sm">{due.student_name || due.student_phone}</p>
                  <p className="text-xs text-gray-500">{due.course_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600 text-sm">৳{Number(due.due_amount).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{due.due_date ? format(new Date(due.due_date), 'dd/MM') : 'তারিখ নেই'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course breakdown */}
      {report?.course_breakdown?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-dark mb-3">কোর্সভিত্তিক আজকের সংগ্রহ</h3>
          <div className="space-y-2">
            {report.course_breakdown.map((c, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{c.course_name}</span>
                <span className="font-semibold text-sm text-primary-600">৳{Number(c.collected).toLocaleString()}</span>
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
    <div className={`${bg} rounded-2xl p-3.5`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-2xl font-bold text-dark">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
