import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { hrApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { Plus, Trash2, Paperclip, X } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORY_LABELS = {
  urgent: { label: 'জরুরি', cls: 'bg-red-50 text-red-600' },
  general: { label: 'সাধারণ', cls: 'bg-blue-50 text-blue-600' },
  event: { label: 'ইভেন্ট', cls: 'bg-green-50 text-green-600' },
};

export default function Notices() {
  const { user } = useAuth();
  const location = useLocation();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'general' });
  const [file, setFile] = useState(null);

  // Only the HR module page (/hr/notices) can create/delete — ESS portal (/portal/notices) is read-only for everyone, including HR staff
  const isHrManager = location.pathname.startsWith('/hr') && (
    user?.role === 'super_admin' ||
    (user?.module_access || []).some(a => a.module_key === 'hr' && ['admin', 'hr_manager'].includes(a.role_key))
  );

  const fetchNotices = () => {
    setLoading(true);
    hrApi.getNotices().then(r => {
      setNotices(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotices();
    localStorage.setItem('notices_last_seen', new Date().toISOString());
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return toast.error('শিরোনাম ও বিবরণ আবশ্যক');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('content', form.content);
      fd.append('category', form.category);
      if (file) fd.append('attachment', file);
      await hrApi.createNotice(fd);
      toast.success('নোটিশ পোস্ট হয়েছে ✅');
      setForm({ title: '', content: '', category: 'general' });
      setFile(null);
      setShowForm(false);
      fetchNotices();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('এই নোটিশটি মুছে ফেলতে চান?')) return;
    try {
      await hrApi.deleteNotice(id);
      toast.success('নোটিশ মুছে ফেলা হয়েছে');
      fetchNotices();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">নোটিশ বোর্ড</h1>
          <p className="text-sm text-gray-500">{notices.length}টি নোটিশ</p>
        </div>
        {isHrManager && (
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-primary-500 text-white px-3 py-2 rounded-xl text-sm font-medium active:scale-95">
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'বাতিল' : 'নতুন নোটিশ'}
          </button>
        )}
      </div>

      {showForm && isHrManager && (
        <form onSubmit={handleSubmit} className="card mb-5 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">শিরোনাম</label>
            <input className="input-field" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="নোটিশের শিরোনাম" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">বিবরণ</label>
            <textarea className="input-field" rows={4} value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="নোটিশের বিস্তারিত লিখুন" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">ক্যাটাগরি</label>
              <select className="input-field" value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                <option value="general">সাধারণ</option>
                <option value="urgent">জরুরি</option>
                <option value="event">ইভেন্ট</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">সংযুক্তি (ঐচ্ছিক)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input-field text-xs"
                onChange={e => setFile(e.target.files[0])} />
            </div>
          </div>
          <button type="submit" disabled={submitting}
            className="w-full bg-primary-500 text-white py-2.5 rounded-xl text-sm font-medium active:scale-95 disabled:opacity-50">
            {submitting ? 'পোস্ট হচ্ছে...' : 'নোটিশ পোস্ট করুন'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-center text-gray-400 py-12">লোড হচ্ছে...</p>
      ) : notices.length === 0 ? (
        <p className="text-center text-gray-400 py-12">কোনো নোটিশ নেই</p>
      ) : (
        <div className="space-y-3">
          {notices.map(n => {
            const cat = CATEGORY_LABELS[n.category] || CATEGORY_LABELS.general;
            return (
              <div key={n.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${cat.cls}`}>{cat.label}</span>
                      <span className="text-xs text-gray-400">{format(new Date(n.created_at), 'dd/MM/yyyy, h:mm a')}</span>
                    </div>
                    <p className="font-medium text-sm mb-1">{n.title}</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.content}</p>
                    {n.attachment_url && (
                      <a href={n.attachment_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 mt-2 text-xs text-primary-600">
                        <Paperclip size={13} /> সংযুক্তি দেখুন
                      </a>
                    )}
                  </div>
                  {isHrManager && (
                    <button onClick={() => handleDelete(n.id)} className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-2.5 pt-2 border-t border-gray-100">
                  পোস্ট করেছেন — {n.created_by_name || 'HR'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
