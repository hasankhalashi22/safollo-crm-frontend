import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Video } from 'lucide-react';
import { academyApi } from '../../api/client';
import toast from 'react-hot-toast';

const EMPTY = { account_name: '', email: '', host_key: '', zoom_user_id: '', notes: '' };

export default function ZoomAccounts() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => academyApi.getZoomAccounts().then(r => setList(r.data || []));
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(EMPTY); setEditId(null); setShowForm(true); };
  const openEdit = (row) => {
    setForm({ account_name: row.account_name, email: row.email, host_key: row.host_key || '', zoom_user_id: row.zoom_user_id || '', notes: row.notes || '' });
    setEditId(row.id); setShowForm(true);
  };

  const save = async () => {
    try {
      if (editId) await academyApi.updateZoomAccount(editId, form);
      else await academyApi.createZoomAccount(form);
      toast.success('সংরক্ষিত হয়েছে');
      setShowForm(false); load();
    } catch { toast.error('সমস্যা হয়েছে'); }
  };

  const del = async (id) => {
    if (!confirm('মুছে ফেলবেন?')) return;
    await academyApi.deleteZoomAccount(id);
    toast.success('মুছে ফেলা হয়েছে');
    load();
  };

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Zoom Accounts</h1>
        <button onClick={openNew} className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-colors">
          <Plus size={16} /> নতুন
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-primary-200 space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary-500 rounded-full"></div>
            <h2 className="font-semibold text-gray-700">{editId ? 'সম্পাদনা' : 'নতুন Zoom Account'}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['account_name', 'Account Name *'], ['email', 'Email *'], ['host_key', 'Host Key'], ['zoom_user_id', 'Zoom User ID']].map(([k, label]) => (
              <div key={k} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-600">{label}</label>
                <input className="input-field" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">Notes</label>
              <textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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
          <div className="p-12 text-center text-gray-400"><Video size={40} className="mx-auto mb-3 opacity-30" /><p>কোনো Zoom account নেই</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>{['Account Name', 'Email', 'Host Key', 'Zoom User ID', ''].map(h => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {list.map(row => (
                  <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{row.account_name}</td>
                    <td className="px-4 py-3 text-gray-500">{row.email}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.host_key || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.zoom_user_id || '—'}</td>
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
