import { useState, useEffect } from 'react';
import { BookMarked, Users, Layers, Banknote, TrendingUp, Clock } from 'lucide-react';
import { academyApi } from '../../api/client';

export default function AcademyDashboard() {
  const [stats, setStats] = useState({ courses: 0, batches: 0, teachers: 0, pendingPayments: 0 });

  useEffect(() => {
    Promise.all([
      academyApi.getCourses(),
      academyApi.getBatches(),
      academyApi.getTeachers(),
      academyApi.getTeacherPayments(),
    ]).then(([courses, batches, teachers, payments]) => {
      const pending = (payments.data || []).filter(p => p.status === 'pending');
      setStats({
        courses: (courses.data || []).length,
        batches: (batches.data || []).length,
        teachers: (teachers.data || []).length,
        pendingPayments: pending.length,
      });
    }).catch(() => {});
  }, []);

  const cards = [
    { label: 'মোট কোর্স', value: stats.courses, icon: BookMarked, color: 'bg-blue-50 text-blue-600' },
    { label: 'সক্রিয় ব্যাচ', value: stats.batches, icon: Layers, color: 'bg-green-50 text-green-600' },
    { label: 'মোট শিক্ষক', value: stats.teachers, icon: Users, color: 'bg-purple-50 text-purple-600' },
    { label: 'পেমেন্ট বাকি', value: stats.pendingPayments, icon: Banknote, color: 'bg-orange-50 text-orange-600' },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Academy Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center text-gray-400">
        <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
        <p>বিস্তারিত রিপোর্ট শীঘ্রই আসছে</p>
      </div>
    </div>
  );
}
