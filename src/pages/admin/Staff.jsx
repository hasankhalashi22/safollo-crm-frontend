import { useState, useEffect } from 'react';
import { usersApi, authApi } from '../../api/client';
import toast from 'react-hot-toast';
import { UserPlus, ToggleLeft, ToggleRight } from 'lucide-react';
import { usersApi, authApi } from '../../api/client';

export default function AdminStaff() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ phone: '', role_id: '', manager_id: '' });
  const [creating, setCreating] = useState(false);

  const fetchUsers = () => {
    usersApi.getAll().then(r => { setUsers(r.data || []); setLoading(false); });
  };

  useEffect(() => {
    fetchUsers();
    usersApi.getRoles().then(r => setRoles(r.data || []));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.phone || form.phone.length !== 11) return toast.error('সঠিক ফোন নম্বর দিন');
    if (!form.role_id) return toast.error('Role বেছে নিন');
    setCreating(true);
    try {
     const payload = { ...form, role_id: parseInt(form.role_id) };
console.log('Creating user with:', payload);
await usersApi.create(payload);
      toast.success('স্টাফ তৈরি হয়েছে ✅');
      setShowCreate(false);
      setForm({ phone: '', role_id: '', manager_id: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await usersApi.toggleActive(id);
      toast.success('স্ট্যাটাস পরিবর্তন হয়েছে');
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    }
  };
const handleResetPassword = async (id, name) => {
    if (!confirm(`${name || 'এই স্টাফ'}-এর পাসওয়ার্ড রিসেট করবেন?`)) return;
    try {
      await authApi.resetPassword(id);
      toast.success('পাসওয়ার্ড রিসেট হয়েছে ✅');
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    }
  };
  const managers = users.filter(u => u.role === 'manager');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark">স্টাফ ম্যানেজমেন্ট</h1>
          <p className="text-gray-500 text-sm">মোট {users.length} জন</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95">
          <UserPlus size={18} /> নতুন স্টাফ
        </button>
      </div>

      {/* Users table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['নাম', 'ফোন', 'Role', 'ম্যানেজার', 'স্ট্যাটাস', 'অ্যাকশন'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">লোড হচ্ছে...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {u.photo_url ? (
                      <img src={u.photo_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-bold text-xs">{(u.full_name || u.phone)?.[0]}</span>
                      </div>
                    )}
                    <span className="font-medium">{u.full_name || '—'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.phone}</td>
                <td className="px-4 py-3">
                  <span className="bg-primary-50 text-primary-600 text-xs px-2 py-0.5 rounded-full">{u.role_label}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.manager_name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggle(u.id)} className="p-1.5 hover:bg-gray-100 rounded-lg">
  {u.is_active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} className="text-gray-400" />}
</button>
<button onClick={() => handleResetPassword(u.id, u.full_name)} className="p-1.5 hover:bg-red-50 rounded-lg ml-1" title="পাসওয়ার্ড রিসেট">
  🔑
</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-lg">নতুন স্টাফ যোগ করুন</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 bg-gray-100 rounded-full">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">ফোন নম্বর *</label>
                <input type="tel" className="input-field" placeholder="01XXXXXXXXX"
                  value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 11) }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Role *</label>
                <select className="input-field" value={form.role_id} onChange={e => setForm(p => ({ ...p, role_id: e.target.value }))}>
                  <option value="">-- Role বেছে নিন --</option>
                  {roles.filter(r => r.name !== 'super_admin').map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
              {form.role_id && roles.find(r => r.id == form.role_id)?.name === 'executive' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">ম্যানেজার</label>
                  <select className="input-field" value={form.manager_id} onChange={e => setForm(p => ({ ...p, manager_id: e.target.value }))}>
                    <option value="">-- ম্যানেজার বেছে নিন --</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.full_name || m.phone}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? 'তৈরি হচ্ছে...' : '✅ স্টাফ তৈরি করুন'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
