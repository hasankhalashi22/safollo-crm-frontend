// AdminDueList.jsx
import { useState, useEffect } from 'react';
import { salesApi } from '../../api/client';
import { format } from 'date-fns';
import { Phone } from 'lucide-react';

export function AdminDueList() {
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    salesApi.getDueList({ limit: 100 }).then(r => {
      setDues(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">বকেয়া তালিকা</h1>
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['স্টুডেন্ট', 'কোর্স', 'বকেয়া', 'তারিখ', 'Executive', 'কল'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">লোড হচ্ছে...</td></tr>
            ) : dues.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-green-500">✅ কোনো বকেয়া নেই</td></tr>
            ) : dues.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
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
                <td className="px-4 py-3">
                  <a href={`tel:${d.student_phone}`} className="p-1.5 bg-green-50 text-green-600 rounded-lg inline-flex">
                    <Phone size={16} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminSettings() {
  const [fields, setFields] = useState([]);
  const [courses, setCourses] = useState([]);
  const [newCourse, setNewCourse] = useState({ name: '', short_name: '', default_price: '' });
  const [newBatch, setNewBatch] = useState({ course_id: '', name: '', price: '' });

  useEffect(() => {
    fieldConfigsApi.getAll().then(r => setFields(r.data || []));
    coursesApi.getAll().then(r => setCourses(r.data || []));
  }, []);

  const toggleField = async (key, current) => {
    try {
      await fieldConfigsApi.update(key, { is_mandatory: !current });
      setFields(f => f.map(field => field.field_key === key ? { ...field, is_mandatory: !current } : field));
      toast.success('আপডেট হয়েছে');
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  const createCourse = async (e) => {
    e.preventDefault();
    try {
      await coursesApi.create({ ...newCourse, default_price: parseFloat(newCourse.default_price) });
      toast.success('কোর্স তৈরি হয়েছে ✅');
      setNewCourse({ name: '', short_name: '', default_price: '' });
      coursesApi.getAll().then(r => setCourses(r.data || []));
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  const createBatch = async (e) => {
    e.preventDefault();
    try {
      await coursesApi.createBatch({ ...newBatch, course_id: parseInt(newBatch.course_id), price: newBatch.price ? parseFloat(newBatch.price) : undefined });
      toast.success('ব্যাচ তৈরি হয়েছে ✅');
      setNewBatch({ course_id: '', name: '', price: '' });
      coursesApi.getAll().then(r => setCourses(r.data || []));
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-display font-bold text-dark">সেটিংস</h1>

      {/* Field config */}
      <div className="card">
        <h2 className="font-semibold text-dark mb-4">সেল ফর্মের Fields</h2>
        <p className="text-sm text-gray-500 mb-3">Mandatory করলে সেল করার সময় এই field পূরণ না করলে সাবমিট হবে না।</p>
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.field_key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="font-medium text-sm">{f.field_label}</span>
              <button
                onClick={() => toggleField(f.field_key, f.is_mandatory)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${f.is_mandatory ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}
              >
                {f.is_mandatory ? 'আবশ্যক ✓' : 'ঐচ্ছিক'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* New course */}
      <div className="card">
        <h2 className="font-semibold text-dark mb-4">নতুন কোর্স যোগ করুন</h2>
        <form onSubmit={createCourse} className="space-y-3">
          <input className="input-field" placeholder="কোর্সের নাম *" value={newCourse.name} onChange={e => setNewCourse(p => ({ ...p, name: e.target.value }))} />
          <input className="input-field" placeholder="Short Name (যেমন: BCS-52)" value={newCourse.short_name} onChange={e => setNewCourse(p => ({ ...p, short_name: e.target.value }))} />
          <input type="number" className="input-field" placeholder="ডিফল্ট মূল্য (৳) *" value={newCourse.default_price} onChange={e => setNewCourse(p => ({ ...p, default_price: e.target.value }))} />
          <button type="submit" className="btn-primary py-2.5">কোর্স তৈরি করুন</button>
        </form>
      </div>

      {/* New batch */}
      <div className="card">
        <h2 className="font-semibold text-dark mb-4">নতুন ব্যাচ যোগ করুন</h2>
        <form onSubmit={createBatch} className="space-y-3">
          <select className="input-field" value={newBatch.course_id} onChange={e => setNewBatch(p => ({ ...p, course_id: e.target.value }))}>
            <option value="">-- কোর্স বেছে নিন --</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input-field" placeholder="ব্যাচের নাম (যেমন: ব্যাচ ৩) *" value={newBatch.name} onChange={e => setNewBatch(p => ({ ...p, name: e.target.value }))} />
          <input type="number" className="input-field" placeholder="মূল্য (খালি রাখলে কোর্সের ডিফল্ট মূল্য)" value={newBatch.price} onChange={e => setNewBatch(p => ({ ...p, price: e.target.value }))} />
          <button type="submit" className="btn-primary py-2.5">ব্যাচ তৈরি করুন</button>
        </form>
      </div>

      {/* Course list */}
      <div className="card">
        <h2 className="font-semibold text-dark mb-4">বর্তমান কোর্সসমূহ</h2>
        <div className="space-y-2">
          {courses.map(c => (
            <div key={c.id} className="p-3 bg-gray-50 rounded-xl">
              <div className="flex justify-between">
                <span className="font-medium">{c.name}</span>
                <span className="text-primary-600 font-bold">৳{Number(c.default_price).toLocaleString()}</span>
              </div>
              {c.batches?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {c.batches.map(b => (
                    <span key={b.id} className="text-xs bg-white px-2 py-0.5 rounded-full border border-gray-200">{b.name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
