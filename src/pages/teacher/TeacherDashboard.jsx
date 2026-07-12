import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { teacherApi } from '../../api/teacherApi';
import toast from 'react-hot-toast';
import { LogOut, BookOpen, Banknote, Clock, CheckCircle, X, Calendar } from 'lucide-react';

const STATUS_LABEL = { scheduled: 'নির্ধারিত', done: 'সম্পন্ন', cancelled: 'বাতিল', rescheduled: 'পুনর্নির্ধারিত' };
const STATUS_COLOR = { scheduled: 'bg-blue-100 text-blue-700', done: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-600', rescheduled: 'bg-yellow-100 text-yellow-700' };
const PAY_COLOR = { pending: 'bg-orange-100 text-orange-700', paid: 'bg-green-100 text-green-700' };

function FeedbackModal({ cls, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('teacher_token');
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/academy/outline/${cls.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teacher_id: cls.teacher_id || null, note }),
      });
      toast.success('ফিডব্যাক জমা হয়েছে — Admin অনুমোদনের পর সম্পন্ন হবে');
      onDone();
    } catch { toast.error('সমস্যা হয়েছে'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">ক্লাস সম্পন্নের ফিডব্যাক</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-sm">
          <p className="font-medium text-gray-700">{cls.topic || `ক্লাস ${cls.class_no}`}</p>
          <p className="text-gray-500 text-xs mt-0.5">{cls.batch_name} • {cls.scheduled_date ? new Date(cls.scheduled_date).toLocaleDateString('bn-BD') : ''}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-600">নোট (ঐচ্ছিক)</label>
          <textarea className="input-field" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="ক্লাস সম্পর্কে কিছু জানাতে চাইলে লিখুন..." />
        </div>
        <div className="flex gap-3">
          <button onClick={submit} disabled={loading} className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
            {loading ? 'জমা হচ্ছে...' : 'ফিডব্যাক জমা দিন'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">বাতিল</button>
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('classes');
  const [classes, setClasses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [loading, setLoading] = useState(true);

  const teacher = JSON.parse(localStorage.getItem('teacher_info') || '{}');

  useEffect(() => {
    const token = localStorage.getItem('teacher_token');
    if (!token) { navigate('/teacher/login'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cls, pay] = await Promise.all([teacherApi.getMyClasses(), teacherApi.getMyPayments()]);
      setClasses(cls.data?.data || []);
      setPayments(pay.data?.data || []);
    } catch { toast.error('ডেটা লোড করতে সমস্যা হয়েছে'); }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('teacher_token');
    localStorage.removeItem('teacher_info');
    navigate('/teacher/login');
  };

  const upcoming = classes.filter(c => c.status === 'scheduled');
  const done = classes.filter(c => c.status === 'done');
  const pendingPay = payments.filter(p => p.status === 'pending');
  const totalPending = pendingPay.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-600 text-white px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-primary-200 text-xs">সাফল্য একাডেমি</p>
          <h1 className="font-bold text-lg">{teacher.full_name}</h1>
          <p className="text-primary-200 text-xs">{teacher.teacher_code}</p>
        </div>
        <button onClick={logout} className="p-2 hover:bg-primary-700 rounded-xl transition-colors">
          <LogOut size={20} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-blue-600">{upcoming.length}</p>
          <p className="text-xs text-gray-500 mt-1">আসন্ন ক্লাস</p>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-green-600">{done.length}</p>
          <p className="text-xs text-gray-500 mt-1">সম্পন্ন</p>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-orange-600">৳{totalPending.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">বাকি পেমেন্ট</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-2 mb-4">
        {[['classes', 'আমার ক্লাস', BookOpen], ['payments', 'পেমেন্ট', Banknote]].map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              tab === key ? 'bg-primary-500 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-8">
        {loading ? (
          <div className="text-center py-12 text-gray-400">লোড হচ্ছে...</div>
        ) : tab === 'classes' ? (
          <div className="space-y-3">
            {classes.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100">
                <Calendar size={36} className="mx-auto mb-3 opacity-30" />
                <p>কোনো ক্লাস নেই</p>
              </div>
            ) : classes.map(cls => (
              <div key={cls.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{cls.topic || `ক্লাস ${cls.class_no}`}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{cls.batch_name} • {cls.course_name}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[cls.status]}`}>
                    {STATUS_LABEL[cls.status]}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {cls.scheduled_date ? new Date(cls.scheduled_date).toLocaleDateString('bn-BD') : '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {cls.scheduled_time || '—'}
                  </span>
                </div>
                {cls.zoom_link && (
                  <a href={cls.zoom_link} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-primary-600 hover:underline">
                    Zoom লিঙ্ক খুলুন →
                  </a>
                )}
                {cls.status === 'scheduled' && (
                  <button
                    onClick={() => setFeedbackModal(cls)}
                    className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-green-700 bg-green-50 hover:bg-green-100 py-2 rounded-lg transition-colors font-medium"
                  >
                    <CheckCircle size={13} /> ক্লাস শেষ — ফিডব্যাক দিন
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {payments.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100">
                <Banknote size={36} className="mx-auto mb-3 opacity-30" />
                <p>কোনো পেমেন্ট নেই</p>
              </div>
            ) : payments.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{p.batch_name || '—'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.class_date ? new Date(p.class_date).toLocaleDateString('bn-BD') : '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">৳{Number(p.amount || 0).toLocaleString()}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PAY_COLOR[p.status]}`}>
                    {p.status === 'paid' ? 'পরিশোধিত' : 'বাকি'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {feedbackModal && (
        <FeedbackModal
          cls={feedbackModal}
          onClose={() => setFeedbackModal(null)}
          onDone={() => { setFeedbackModal(null); loadData(); }}
        />
      )}
    </div>
  );
}
