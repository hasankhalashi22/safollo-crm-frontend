import { useState, useEffect } from 'react';
import { BookMarked, Users, Layers, Banknote, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';

export default function AcademyDashboard() {
  const [stats, setStats] = useState({ courses: 0, batches: 0, teachers: 0, pendingPayments: 0 });
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFb, setLoadingFb] = useState(true);

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

    loadFeedbacks();
  }, []);

  const loadFeedbacks = () => {
    setLoadingFb(true);
    academyApi.getPendingFeedbacks()
      .then(r => setFeedbacks(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingFb(false));
  };

  const approve = async (id, approved) => {
    try {
      await academyApi.approveFeedback(id, approved);
      toast.success(approved ? 'অনুমোদিত হয়েছে' : 'বাতিল হয়েছে');
      loadFeedbacks();
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  const cards = [
    { label: 'মোট কোর্স', value: stats.courses, icon: BookMarked, color: 'bg-blue-50 text-blue-600' },
    { label: 'সক্রিয় ব্যাচ', value: stats.batches, icon: Layers, color: 'bg-green-50 text-green-600' },
    { label: 'মোট শিক্ষক', value: stats.teachers, icon: Users, color: 'bg-purple-50 text-purple-600' },
    { label: 'পেমেন্ট বাকি', value: stats.pendingPayments, icon: Banknote, color: 'bg-orange-50 text-orange-600' },
  ];

  return (
    <div className="p-3 md:p-6 space-y-4">
      <h1 className="text-lg font-bold text-gray-800">Academy Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Feedbacks */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">অপেক্ষারত ফিডব্যাক</h2>
          {feedbacks.length > 0 && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{feedbacks.length} টি</span>
          )}
        </div>
        {loadingFb ? (
          <div className="p-8 text-center text-gray-400 text-sm">লোড হচ্ছে...</div>
        ) : feedbacks.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <CheckCircle size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">কোনো অপেক্ষারত ফিডব্যাক নেই</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">ব্যাচ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">ক্লাস / বিষয়</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">তারিখ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">শিক্ষক</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">নোট</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">একশন</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map(fb => (
                  <tr key={fb.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-600">{fb.batch_name || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-medium text-gray-700">{fb.topic || `ক্লাস-${fb.class_no}`}</p>
                      <p className="text-gray-400">{fb.subject_name || ''}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {fb.scheduled_date ? new Date(fb.scheduled_date).toLocaleDateString('bn-BD') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{fb.teacher_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate" title={fb.note}>{fb.note || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => approve(fb.id, true)}
                          className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                          <CheckCircle size={12} /> অনুমোদন
                        </button>
                        <button onClick={() => approve(fb.id, false)}
                          className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                          <XCircle size={12} /> বাতিল
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
