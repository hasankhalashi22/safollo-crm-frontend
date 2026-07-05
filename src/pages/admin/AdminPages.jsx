import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { salesApi, fieldConfigsApi, coursesApi, usersApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Phone, Edit, Trash2, X, ZoomIn } from 'lucide-react';

export function AdminDueList() {
  const { user: currentUser } = useAuth();
  const [dues, setDues] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [execFilter, setExecFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reassignModal, setReassignModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 30;

  const fetchDues = () => {
    setLoading(true);
    salesApi.getDueList({ limit: 500 }).then(r => {
      setDues(r.data || []);
      setFiltered(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDues();
    usersApi.getAll().then(r => setExecutives(r.data || []));
  }, []);

  useEffect(() => {
    let result = [...dues];
    if (search) {
      result = result.filter(d =>
        d.student_phone?.includes(search) ||
        d.student_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.executive_name?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (execFilter) result = result.filter(d => d.executive_name === execFilter);
    if (dateFrom) result = result.filter(d => d.last_due_date && new Date(d.last_due_date) >= new Date(dateFrom));
    if (dateTo) result = result.filter(d => d.last_due_date && new Date(d.last_due_date) <= new Date(dateTo));
    setFiltered(result);
    setCurrentPage(1);
  }, [search, execFilter, dateFrom, dateTo, dues]);

  const handleExport = () => {
    if (filtered.length === 0) return toast.error('কোনো ডেটা নেই');
    const headers = ['স্টুডেন্ট', 'ফোন', 'কোর্স', 'ব্যাচ', 'বাকি', 'তারিখ', 'Executive'];
    const rows = filtered.map(d => [
      d.student_name || '', d.student_phone, d.course_name, d.batch_name || '',
      d.due_amount,
      d.last_due_date ? format(new Date(d.last_due_date), 'dd/MM/yyyy') : '',
      d.executive_name || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `বকেয়া_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Download হয়েছে ✅');
  };

  const handleDeleteDue = async (due) => {
    if (!confirm(`এই বকেয়া entry permanently delete করবেন?`)) return;
    try {
      await salesApi.delete(due.id);
      toast.success('Delete হয়েছে ✅');
      fetchDues();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-display font-bold text-dark">
          বকেয়া তালিকা
          <span className="ml-2 text-sm font-normal text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{filtered.length}টি</span>
        </h1>
        <button onClick={handleExport} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95">
          ⬇️ Download
        </button>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <input className="input-field" placeholder="ফোন, নাম বা Executive" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input-field" value={execFilter} onChange={e => setExecFilter(e.target.value)}>
            <option value="">সব Executive</option>
            {[...new Set(dues.map(d => d.executive_name).filter(Boolean))].map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <input type="date" className="input-field" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input type="date" className="input-field" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['স্টুডেন্ট', 'কোর্স', 'বাকি', 'তারিখ', 'Executive', 'কল', 'Reassign', 'Delete'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">লোড হচ্ছে...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-green-500">✅ কোনো বকেয়া নেই</td></tr>
            ) : filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(d => (
              <tr key={d.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setHistoryModal(d)}>
                <td className="px-4 py-3">
                  <p className="font-medium">{d.student_name || '—'}</p>
                  <p className="text-xs text-gray-400">{d.student_phone}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{d.course_name}</p>
                  <p className="text-xs text-gray-400">{d.batch_name}</p>
                </td>
                <td className="px-4 py-3 text-red-600 font-bold">৳{Number(d.due_amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500">
                  {d.last_due_date ? format(new Date(d.last_due_date), 'dd/MM/yyyy') : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">{d.executive_name || '—'}</td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <a href={`tel:${d.student_phone}`} className="p-1.5 bg-green-50 text-green-600 rounded-lg inline-flex">
                    <Phone size={16} />
                  </a>
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setReassignModal(d)} className="px-2 py-1 bg-primary-50 text-primary-600 rounded-lg text-xs font-medium">
                    Reassign
                  </button>
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  {currentUser?.role === 'super_admin' && (
                    <button onClick={() => handleDeleteDue(d)}
                      className="px-2 py-1 bg-red-50 text-red-500 rounded-lg text-xs font-medium">
                      🗑️
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > PAGE_SIZE && (() => {
          const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
          const pages = [];
          for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) pages.push(i);
            else if (pages[pages.length - 1] !== '...') pages.push('...');
          }
          return (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">মোট {filtered.length}টি — পেইজ {currentPage}/{totalPages}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50">←</button>
                {pages.map((p, i) => p === '...' ? (
                  <span key={`e${i}`} className="px-2 text-gray-400 text-sm">...</span>
                ) : (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === p ? 'bg-primary-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50">→</button>
              </div>
            </div>
          );
        })()}
      </div>

      {reassignModal && (
        <ReassignModal due={reassignModal} executives={executives}
          onClose={() => setReassignModal(null)}
          onSuccess={() => { setReassignModal(null); fetchDues(); }} />
      )}
      {historyModal && (
        <DueHistoryModal due={historyModal} onClose={() => setHistoryModal(null)} />
      )}
    </div>
  );
}

function ReassignModal({ due, executives, onClose, onSuccess }) {
  const [newExecId, setNewExecId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newExecId) return toast.error('Executive বেছে নিন');
    setLoading(true);
    try {
      await salesApi.reassign(due.id, newExecId);
      toast.success('Reassign হয়েছে ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">Reassign করুন</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
          <p className="font-medium">{due.student_name || due.student_phone}</p>
          <p className="text-gray-500">{due.course_name}</p>
          <p className="text-red-600 font-bold">বাকি: ৳{Number(due.due_amount).toLocaleString()}</p>
          <p className="text-gray-400 text-xs mt-1">বর্তমান: {due.executive_name || '—'}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select className="input-field" value={newExecId} onChange={e => setNewExecId(e.target.value)}>
            <option value="">-- নতুন Executive বেছে নিন --</option>
            {executives.map(e => (
              <option key={e.id} value={e.id}>{e.full_name || e.phone} ({e.role_label})</option>
            ))}
          </select>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'হচ্ছে...' : '✅ Reassign করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function CourseManagement() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
 const [newCourse, setNewCourse] = useState({ name: '', short_name: '', default_price: '', is_book: false });
  const [newBatch, setNewBatch] = useState({ course_id: '', name: '', price: '' });
  const [editCourse, setEditCourse] = useState(null);
  const [editBatch, setEditBatch] = useState(null);

 const fetchCourses = () => {
    coursesApi.getAll().then(r => {
      const data = Array.isArray(r) ? r : (r.data || []);
      setCourses(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleDeleteCourse = async (course) => {
    if (!confirm(`"${course.name}" কোর্স delete করবেন?`)) return;
    try {
      await coursesApi.delete(course.id);
      toast.success('কোর্স delete হয়েছে ✅');
      fetchCourses();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  const handleDeleteBatch = async (batch) => {
    if (!confirm(`"${batch.name}" ব্যাচ delete করবেন?`)) return;
    try {
      await coursesApi.deleteBatch(batch.id);
      toast.success('ব্যাচ delete হয়েছে ✅');
      fetchCourses();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

const createCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.name) return toast.error('কোর্সের নাম দিন');
    if (!newCourse.default_price) return toast.error('মূল্য দিন');
    try {
      await coursesApi.create({ ...newCourse, default_price: parseFloat(newCourse.default_price) });
      toast.success('কোর্স তৈরি হয়েছে ✅');
      setNewCourse({ name: '', short_name: '', default_price: '', is_book: false });
      fetchCourses();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  const updateCourse = async (e) => {
    e.preventDefault();
    try {
      await coursesApi.update(editCourse.id, {
        name: editCourse.name,
        default_price: parseFloat(editCourse.default_price),
        is_active: editCourse.is_active,
      });
      toast.success('কোর্স আপডেট হয়েছে ✅');
      setEditCourse(null);
      fetchCourses();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  const createBatch = async (e) => {
    e.preventDefault();
    if (!newBatch.course_id) return toast.error('কোর্স বেছে নিন');
    if (!newBatch.name) return toast.error('ব্যাচের নাম দিন');
    try {
      await coursesApi.createBatch({
        ...newBatch,
        course_id: parseInt(newBatch.course_id),
        price: newBatch.price ? parseFloat(newBatch.price) : undefined
      });
      toast.success('ব্যাচ তৈরি হয়েছে ✅');
      setNewBatch({ course_id: '', name: '', price: '' });
      fetchCourses();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  const updateBatch = async (e) => {
    e.preventDefault();
    try {
      await coursesApi.updateBatch(editBatch.id, {
        name: editBatch.name,
        price: editBatch.price ? parseFloat(editBatch.price) : undefined,
        is_active: editBatch.is_active,
      });
      toast.success('ব্যাচ আপডেট হয়েছে ✅');
      setEditBatch(null);
      fetchCourses();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-display font-bold text-dark">কোর্স ম্যানেজমেন্ট</h1>

      <div className="card">
        <h2 className="font-semibold text-dark mb-4">নতুন কোর্স যোগ করুন</h2>
        <form onSubmit={createCourse} className="space-y-3">
          <input className="input-field" placeholder="কোর্সের নাম *" value={newCourse.name} onChange={e => setNewCourse(p => ({ ...p, name: e.target.value }))} />
          <input className="input-field" placeholder="Short Name (যেমন: BCS-52)" value={newCourse.short_name} onChange={e => setNewCourse(p => ({ ...p, short_name: e.target.value }))} />
         <input type="number" className="input-field" placeholder="ডিফল্ট মূল্য (৳) *" value={newCourse.default_price} onChange={e => setNewCourse(p => ({ ...p, default_price: e.target.value }))} />
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={newCourse.is_book}
              onChange={e => setNewCourse(p => ({ ...p, is_book: e.target.checked }))} />
            <label className="text-sm">এটি একটি বই (Book)</label>
          </div>
          <button type="submit" className="btn-primary py-2.5">কোর্স তৈরি করুন</button>
        </form>
      </div>

      <div className="card">
        <h2 className="font-semibold text-dark mb-4">নতুন ব্যাচ যোগ করুন</h2>
        <form onSubmit={createBatch} className="space-y-3">
          <select className="input-field" value={newBatch.course_id} onChange={e => setNewBatch(p => ({ ...p, course_id: e.target.value }))}>
            <option value="">-- কোর্স বেছে নিন --</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input-field" placeholder="ব্যাচের নাম *" value={newBatch.name} onChange={e => setNewBatch(p => ({ ...p, name: e.target.value }))} />
          <input type="number" className="input-field" placeholder="মূল্য (খালি রাখলে কোর্সের ডিফল্ট)" value={newBatch.price} onChange={e => setNewBatch(p => ({ ...p, price: e.target.value }))} />
          <button type="submit" className="btn-primary py-2.5">ব্যাচ তৈরি করুন</button>
        </form>
      </div>

      <div className="card">
        <h2 className="font-semibold text-dark mb-4">বর্তমান কোর্সসমূহ</h2>
        {loading ? <div className="flex justify-center py-4"><div className="spinner w-6 h-6" /></div> :
          courses.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">কোনো কোর্স নেই</p> : (
          <div className="space-y-3">
            {courses.map(c => (
              <div key={c.id} className={`p-3 rounded-xl border ${c.is_active ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium">{c.name}</span>
                    {!c.is_active && <span className="ml-2 text-xs text-gray-400">(নিষ্ক্রিয়)</span>}
                    <p className="text-xs text-gray-400">{c.short_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary-600 font-bold">৳{Number(c.default_price).toLocaleString()}</span>
                    <button onClick={() => setEditCourse({ ...c })} className="p-1.5 bg-primary-50 text-primary-600 rounded-lg">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDeleteCourse(c)} className="p-1.5 bg-red-50 text-red-500 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {c.batches?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {c.batches.map(b => (
                      <div key={b.id} className="flex items-center gap-1">
                        <button onClick={() => setEditBatch({ ...b, course_name: c.name })}
                          className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1
                            ${b.is_active ? 'bg-white border-gray-200 text-gray-600' : 'bg-gray-100 border-gray-200 text-gray-400'}`}>
                          {b.name} <Edit size={10} />
                        </button>
                        <button onClick={() => handleDeleteBatch(b)}
                          className="text-xs w-5 h-5 rounded-full bg-red-50 text-red-400 flex items-center justify-center">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editCourse && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-lg">কোর্স এডিট</h3>
              <button onClick={() => setEditCourse(null)} className="p-1.5 bg-gray-100 rounded-full">✕</button>
            </div>
            <form onSubmit={updateCourse} className="space-y-3">
              <input className="input-field" value={editCourse.name} onChange={e => setEditCourse(p => ({ ...p, name: e.target.value }))} />
              <input type="number" className="input-field" value={editCourse.default_price} onChange={e => setEditCourse(p => ({ ...p, default_price: e.target.value }))} />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editCourse.is_active} onChange={e => setEditCourse(p => ({ ...p, is_active: e.target.checked }))} />
                <span className="text-sm">সক্রিয়</span>
              </label>
              <button type="submit" className="btn-primary">আপডেট করুন</button>
            </form>
          </div>
        </div>
      )}

      {editBatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-lg">ব্যাচ এডিট — {editBatch.course_name}</h3>
              <button onClick={() => setEditBatch(null)} className="p-1.5 bg-gray-100 rounded-full">✕</button>
            </div>
            <form onSubmit={updateBatch} className="space-y-3">
              <input className="input-field" placeholder="ব্যাচের নাম" value={editBatch.name} onChange={e => setEditBatch(p => ({ ...p, name: e.target.value }))} />
              <input type="number" className="input-field" placeholder="মূল্য (ঐচ্ছিক)" value={editBatch.price || ''} onChange={e => setEditBatch(p => ({ ...p, price: e.target.value }))} />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editBatch.is_active} onChange={e => setEditBatch(p => ({ ...p, is_active: e.target.checked }))} />
                <span className="text-sm">সক্রিয়</span>
              </label>
              <button type="submit" className="btn-primary">আপডেট করুন</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminSettings() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fieldConfigsApi.getAll().then(r => { setFields(r.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleField = async (key, current) => {
    try {
      await fieldConfigsApi.update(key, { is_mandatory: !current });
      setFields(f => f.map(field => field.field_key === key ? { ...field, is_mandatory: !current } : field));
      toast.success('আপডেট হয়েছে');
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-display font-bold text-dark mb-2">সেটিংস</h1>
      <p className="text-gray-500 text-sm mb-6">সেল ফর্মের field গুলো mandatory বা optional করুন</p>
      <div className="card">
        <h2 className="font-semibold text-dark mb-4">সেল ফর্মের Fields</h2>
        {loading ? <div className="flex justify-center py-4"><div className="spinner w-6 h-6" /></div> : (
          <div className="space-y-3">
            {fields.map(f => (
              <div key={f.field_key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <span className="font-medium text-sm">{f.field_label}</span>
                  <p className="text-xs text-gray-400">{f.field_key}</p>
                </div>
                <button onClick={() => toggleField(f.field_key, f.is_mandatory)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all
                    ${f.is_mandatory ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                  {f.is_mandatory ? 'আবশ্যক ✓' : 'ঐচ্ছিক'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
const MONTH_BN = ['জানু','ফেব্রু','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টে','অক্টো','নভে','ডিসে'];

function DueHistoryModal({ due, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoomImg, setZoomImg] = useState(null);

  useEffect(() => {
    salesApi.getById(due.id).then(res => {
      setDetail(res.data || res);
      setLoading(false);
    }).catch(() => {
      toast.error('লোড হয়নি, আবার চেষ্টা করুন');
      setLoading(false);
    });
  }, [due.id]);

  const history = detail?.payment_history || [];

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="font-display font-bold text-lg">{due.student_name || due.student_phone}</p>
            <p className="text-xs text-gray-400">{due.course_name} • {due.batch_name} • {due.executive_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-gray-100"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex justify-center py-10"><div className="spinner w-6 h-6" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">ভর্তির তারিখ</p>
                  <p className="font-semibold text-sm">{detail?.created_at ? format(new Date(detail.created_at), 'dd MMM yyyy') : '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">কোর্স মূল্য</p>
                  <p className="font-semibold text-sm">৳{Number(due.course_price).toLocaleString()}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">মোট সংগৃহীত</p>
                  <p className="font-semibold text-sm text-green-600">৳{Number(due.total_collected).toLocaleString()}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-0.5">বকেয়া</p>
                  <p className="font-bold text-sm text-red-600">৳{Number(due.due_amount).toLocaleString()}</p>
                </div>
                {due.last_due_date && (
                  <div className="col-span-2 bg-orange-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">পরিশোধের প্রতিশ্রুতির তারিখ</p>
                    <p className="font-semibold text-sm text-orange-600">{format(new Date(due.last_due_date), 'dd MMM yyyy')}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">পেমেন্ট ইতিহাস ({history.length}টি)</p>
                {history.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">কোনো পেমেন্ট রেকর্ড নেই</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((p, i) => (
                      <div key={p.id || i} className="border border-gray-100 rounded-2xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-green-600 text-base">৳{Number(p.amount).toLocaleString()}</span>
                          <span className="text-xs text-gray-400">{p.created_at ? format(new Date(p.created_at), 'dd MMM yyyy, hh:mm a') : ''}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
                          {p.payment_method && <span>পদ্ধতি: <strong className="text-gray-700">{p.payment_method}</strong></span>}
                          {p.sender_number && <span>নম্বর: <strong className="text-gray-700">{p.sender_number}</strong></span>}
                          {p.transaction_id && <span className="col-span-2">TxnID: <strong className="text-gray-700">{p.transaction_id}</strong></span>}
                          {p.due_date && <span className="col-span-2 text-orange-600">পরবর্তী পরিশোধ: <strong>{format(new Date(p.due_date), 'dd MMM yyyy')}</strong></span>}
                          {p.collected_by_name && <span className="col-span-2">এন্ট্রি: <strong className="text-gray-700">{p.collected_by_name}</strong></span>}
                          {p.notes && <span className="col-span-2 text-blue-600">নোট: {p.notes}</span>}
                        </div>
                        {p.payment_proof_url && (
                          <button onClick={() => setZoomImg(p.payment_proof_url)}
                            className="flex items-center gap-1.5 text-xs text-primary-600 bg-primary-50 px-3 py-1.5 rounded-xl">
                            <ZoomIn size={14} /> পেমেন্ট প্রুফ দেখুন
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-5 pb-4 pt-3 border-t border-gray-100 flex-shrink-0">
          <a href={`tel:${due.student_phone}`}
            className="flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-600 rounded-xl text-sm font-medium w-full">
            <Phone size={16} /> কল করুন ({due.student_phone})
          </a>
        </div>
      </div>

      {zoomImg && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="proof" className="max-w-full max-h-full rounded-xl object-contain" />
          <button className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white"><X size={20} /></button>
        </div>
      )}
    </div>,
    document.body
  );
}
