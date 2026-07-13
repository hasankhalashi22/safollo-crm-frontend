import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Layers, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';

const EMPTY = { batch_name: '', course_id: '', plan_id: '', start_date: '', max_students: '' };
const STATUS_LABEL = { upcoming: 'আসছে', active: 'সক্রিয়', completed: 'সম্পন্ন', cancelled: 'বাতিল' };
const STATUS_COLOR = { upcoming: 'bg-blue-100 text-blue-700', active: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-600' };

export default function Batches() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [courses, setCourses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => academyApi.getBatches().then(r => setList(r.data || []));

  useEffect(() => {
    load();
    academyApi.getCourses().then(r => setCourses(r.data || []));
  }, []);

  useEffect(() => {
    if (form.course_id) academyApi.getCoursePlans(form.course_id).then(r => setPlans(r.data || []));
    else setPlans([]);
  }, [form.course_id]);

  const openNew = () => { setForm(EMPTY); setEditId(null); setShowForm(true); };
  const openEdit = (row) => {
    setForm({ batch_name: row.batch_name, course_id: row.course_id, plan_id: row.plan_id || '', start_date: row.start_date?.split('T')[0] || '', max_students: row.max_students || '' });
    setEditId(row.id); setShowForm(true);
  };

  const save = async () => {
    if (!form.batch_name.trim() || !form.course_id) return toast.error('ব্যাচের নাম ও কোর্স দিন');
    try {
      const payload = { ...form, max_students: form.max_students ? Number(form.max_students) : null };
      if (editId) await academyApi.updateBatch(editId, payload);
      else await academyApi.createBatch(payload);
      toast.success('সংরক্ষিত হয়েছে'); setShowForm(false); load();
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  const del = async (id) => {
    if (!confirm('ব্যাচ মুছে ফেলবেন?')) return;
    await academyApi.deleteBatch(id); toast.success('মুছে ফেলা হয়েছে'); load();
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-800 flex-1">ব্যাচ সমূহ</h1>
        <button onClick={openNew} className="btn-primary flex items-center justify-center gap-1.5 text-sm w-1/3"><Plus size={15} /> নতুন ব্যাচ ও রুটিন তৈরি করুন</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-primary-200 space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary-500 rounded-full"></div>
            <h2 className="font-semibold text-gray-700 text-base">{editId ? 'ব্যাচ সম্পাদনা' : 'নতুন ব্যাচ'}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">ব্যাচের নাম <span className="text-red-500">*</span></label>
              <input className="input-field" placeholder="যেমন: BCS-50 ব্যাচ" value={form.batch_name} onChange={e => set('batch_name', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">কোর্স <span className="text-red-500">*</span></label>
              <select className="input-field" value={form.course_id} onChange={e => set('course_id', e.target.value)}>
                <option value="">কোর্স বেছে নিন</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">কোর্স প্ল্যান</label>
              <select className="input-field" value={form.plan_id} onChange={e => set('plan_id', e.target.value)} disabled={!form.course_id}>
                <option value="">প্ল্যান বেছে নিন</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.plan_name} (v{p.version})</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">শুরুর তারিখ</label>
              <input type="date" className="input-field" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">সর্বোচ্চ শিক্ষার্থী</label>
              <input type="number" className="input-field" placeholder="যেমন: 50" value={form.max_students} onChange={e => set('max_students', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={save} className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-8 py-2.5 rounded-xl transition-colors text-sm">সংরক্ষণ</button>
            <button onClick={() => setShowForm(false)} className="bg-white hover:bg-gray-50 text-gray-600 font-medium px-6 py-2.5 rounded-xl border-2 border-gray-200 transition-colors text-sm">বাতিল</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.length === 0 ? (
          <div className="col-span-3 bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
            <Layers size={40} className="mx-auto mb-3 opacity-30" /><p>কোনো ব্যাচ নেই</p>
          </div>
        ) : list.map(b => (
          <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-800">{b.batch_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{b.course_name}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[b.status] || 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABEL[b.status] || b.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 flex-1">{b.start_date ? `${new Date(b.start_date).toLocaleDateString('bn-BD')} থেকে` : ''}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => navigate(`/academy/batches/${b.id}`)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-xl transition-colors ${
                  Number(b.total_classes) > 0
                    ? 'bg-primary-500 hover:bg-primary-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}>
                {Number(b.total_classes) > 0 ? 'রুটিন দেখুন' : 'রুটিন তৈরি করুন'} <ChevronRight size={15} />
              </button>
              <button onClick={() => openEdit(b)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-500"><Edit2 size={14} /></button>
              <button onClick={() => del(b.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
