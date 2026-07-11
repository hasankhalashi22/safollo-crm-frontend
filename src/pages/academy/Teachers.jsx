import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, UserCheck } from 'lucide-react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';

const EMPTY = { full_name: '', phone: '', email: '', teacher_type: 'junior', teacher_category: 'non_cadre', specialization: '', bio: '', zoom_display_name: '', fixed_rate: '' };
const TEACHER_TYPE_LABEL = { senior: 'সিনিয়র', junior: 'জুনিয়র', guest: 'গেস্ট' };
const CAT_LABEL = { cadre: 'ক্যাডার', non_cadre: 'নন-ক্যাডার', others: 'অন্যান্য' };

export default function Teachers() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => academyApi.getTeachers().then(r => setList(r.data || []));
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setEditId(null); setShowForm(true); };
  const openEdit = (row) => {
    setForm({ full_name: row.full_name, phone: row.phone || '', email: row.email || '', teacher_type: row.teacher_type, teacher_category: row.teacher_category || 'non_cadre', specialization: row.specialization || '', bio: row.bio || '', zoom_display_name: row.zoom_display_name || '', fixed_rate: row.fixed_rate ?? '' });
    setEditId(row.id); setShowForm(true);
  };

  const save = async () => {
    if (!form.full_name.trim()) return toast.error('নাম দিন');
    try {
      if (editId) await academyApi.updateTeacher(editId, form);
      else await academyApi.createTeacher(form);
      toast.success('সংরক্ষিত হয়েছে');
      setShowForm(false); load();
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  const del = async (id) => {
    if (!confirm('মুছে ফেলবেন?')) return;
    await academyApi.deleteTeacher(id); toast.success('মুছে ফেলা হয়েছে'); load();
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">শিক্ষকবৃন্দ</h1>
        <button onClick={openNew} className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-colors">
          <Plus size={16} /> নতুন শিক্ষক
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-primary-200 space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary-500 rounded-full"></div>
            <h2 className="font-semibold text-gray-700">{editId ? 'শিক্ষক সম্পাদনা' : 'নতুন শিক্ষক'}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">পুরো নাম <span className="text-red-500">*</span></label>
              <input className="input-field" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">শিক্ষক ধরন</label>
              <select className="input-field" value={form.teacher_type} onChange={e => set('teacher_type', e.target.value)}>
                {Object.entries(TEACHER_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">পেমেন্ট ক্যাটাগরি</label>
              <select className="input-field" value={form.teacher_category} onChange={e => set('teacher_category', e.target.value)}>
                {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">ফোন</label>
              <input className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">ইমেইল</label>
              <input className="input-field" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">বিষয়/বিশেষত্ব</label>
              <input className="input-field" value={form.specialization} onChange={e => set('specialization', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">Zoom Display Name</label>
              <input className="input-field" value={form.zoom_display_name} onChange={e => set('zoom_display_name', e.target.value)} />
            </div>
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">Bio</label>
              <textarea className="input-field" rows={2} value={form.bio} onChange={e => set('bio', e.target.value)} />
            </div>
            {/* Fixed rate — exceptional teachers */}
            <div className="md:col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-1.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Exceptional</span>
                <label className="text-sm font-medium text-amber-800">ফিক্সড রেট (প্রতি ক্লাস)</label>
              </div>
              <p className="text-xs text-amber-600 mb-2">এই ফিল্ড পূরণ করলে উপরের ক্যাটাগরি ও অনলাইন/অফলাইন রেট উপেক্ষা করা হবে — সব ক্লাসে এই রেটই প্রযোজ্য হবে।</p>
              <div className="flex items-center gap-2 max-w-xs">
                <span className="text-gray-500 text-sm font-medium">৳</span>
                <input
                  type="number"
                  className="input-field flex-1"
                  placeholder="ফাঁকা রাখলে স্ট্যান্ডার্ড রেট"
                  value={form.fixed_rate}
                  onChange={e => set('fixed_rate', e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={save} className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-8 py-2.5 rounded-xl transition-colors text-sm">সংরক্ষণ</button>
            <button onClick={() => setShowForm(false)} className="bg-white hover:bg-gray-50 text-gray-600 font-medium px-6 py-2.5 rounded-xl border-2 border-gray-200 transition-colors text-sm">বাতিল</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-400"><UserCheck size={40} className="mx-auto mb-3 opacity-30" /><p>কোনো শিক্ষক নেই</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>{['কোড', 'নাম', 'ধরন', 'ক্যাটাগরি', 'ফোন', 'ফিক্সড রেট', ''].map(h => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {list.map(row => (
                  <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-primary-600">{row.teacher_code}</td>
                    <td className="px-4 py-3 font-medium">{row.full_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{TEACHER_TYPE_LABEL[row.teacher_type]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        row.teacher_category === 'cadre' ? 'bg-purple-100 text-purple-700' :
                        row.teacher_category === 'others' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'}`}>
                        {CAT_LABEL[row.teacher_category] || 'নন-ক্যাডার'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{row.phone || '—'}</td>
                    <td className="px-4 py-3">
                      {row.fixed_rate ? (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">৳{Number(row.fixed_rate).toLocaleString()}</span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Edit2 size={14} /></button>
                        <button onClick={() => del(row.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
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
