import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, UserCheck, Phone, Mail } from 'lucide-react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';

const EMPTY = { full_name: '', phone: '', email: '', teacher_type: 'junior', specialization: '', bio: '', zoom_display_name: '' };
const TEACHER_TYPE_LABEL = { senior: 'à¦¸à¦¿à¦¨à¦¿à¦¯à¦¼à¦°', junior: 'à¦œà§à¦¨à¦¿à¦¯à¦¼à¦°', guest: 'à¦—à§‡à¦¸à§à¦Ÿ' };

export default function Teachers() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => academyApi.getTeachers().then(r => setList(r.data || []));
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setEditId(null); setShowForm(true); };
  const openEdit = (row) => {
    setForm({ full_name: row.full_name, phone: row.phone || '', email: row.email || '', teacher_type: row.teacher_type, specialization: row.specialization || '', bio: row.bio || '', zoom_display_name: row.zoom_display_name || '' });
    setEditId(row.id); setShowForm(true);
  };

  const save = async () => {
    if (!form.full_name.trim()) return toast.error('à¦¨à¦¾à¦® à¦¦à¦¿à¦¨');
    try {
      if (editId) await academyApi.updateTeacher(editId, form);
      else await academyApi.createTeacher(form);
      toast.success('à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤ à¦¹à¦¯à¦¼à§‡à¦›à§‡');
      setShowForm(false); load();
    } catch { toast.error('à¦¸à¦®à¦¸à§à¦¯à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡'); }
  };

  const del = async (id) => {
    if (!confirm('à¦®à§à¦›à§‡ à¦«à§‡à¦²à¦¬à§‡à¦¨?')) return;
    await academyApi.deleteTeacher(id); toast.success('à¦®à§à¦›à§‡ à¦«à§‡à¦²à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡'); load();
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">à¦¶à¦¿à¦•à§à¦·à¦•à¦¬à§ƒà¦¨à§à¦¦</h1>
        <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> à¦¨à¦¤à§à¦¨ à¦¶à¦¿à¦•à§à¦·à¦•</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-semibold text-gray-700">{editId ? 'à¦¶à¦¿à¦•à§à¦·à¦• à¦¸à¦®à§à¦ªà¦¾à¦¦à¦¨à¦¾' : 'à¦¨à¦¤à§à¦¨ à¦¶à¦¿à¦•à§à¦·à¦•'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label">à¦ªà§à¦°à§‹ à¦¨à¦¾à¦® *</label><input className="input-field" value={form.full_name} onChange={e => set('full_name', e.target.value)} /></div>
            <div>
              <label className="label">à¦¶à¦¿à¦•à§à¦·à¦• à¦§à¦°à¦¨</label>
              <select className="input-field" value={form.teacher_type} onChange={e => set('teacher_type', e.target.value)}>
                {Object.entries(TEACHER_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className="label">à¦«à§‹à¦¨</label><input className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
            <div><label className="label">à¦‡à¦®à§‡à¦‡à¦²</label><input className="input-field" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div><label className="label">à¦¬à¦¿à¦·à¦¯à¦¼/à¦¬à¦¿à¦¶à§‡à¦·à¦¤à§à¦¬</label><input className="input-field" value={form.specialization} onChange={e => set('specialization', e.target.value)} /></div>
            <div><label className="label">Zoom Display Name</label><input className="input-field" value={form.zoom_display_name} onChange={e => set('zoom_display_name', e.target.value)} /></div>
            <div className="md:col-span-2"><label className="label">Bio</label><textarea className="input-field" rows={2} value={form.bio} onChange={e => set('bio', e.target.value)} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} className="btn-primary">à¦¸à¦‚à¦°à¦•à§à¦·à¦£</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">à¦¬à¦¾à¦¤à¦¿à¦²</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center text-gray-400"><UserCheck size={40} className="mx-auto mb-3 opacity-30" /><p>à¦•à§‹à¦¨à§‹ à¦¶à¦¿à¦•à§à¦·à¦• à¦¨à§‡à¦‡</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['à¦•à§‹à¦¡', 'à¦¨à¦¾à¦®', 'à¦§à¦°à¦¨', 'à¦«à§‹à¦¨', 'à¦¬à¦¿à¦¶à§‡à¦·à¦¤à§à¦¬', ''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody>
              {list.map(row => (
                <tr key={row.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-primary-600">{row.teacher_code}</td>
                  <td className="px-4 py-3 font-medium">{row.full_name}</td>
                  <td className="px-4 py-3"><span className="badge badge-blue">{TEACHER_TYPE_LABEL[row.teacher_type]}</span></td>
                  <td className="px-4 py-3 text-gray-500">{row.phone || 'â€”'}</td>
                  <td className="px-4 py-3 text-gray-500">{row.specialization || 'â€”'}</td>
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
        )}
      </div>
    </div>
  );
}

