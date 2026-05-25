import { useState, useEffect } from 'react';
import { usersApi } from '../../api/client';
import toast from 'react-hot-toast';
import { Trash2, Edit, Plus } from 'lucide-react';

const ALL_PERMISSIONS = [
  { key: 'create_sale',     label: 'নতুন সেল ইনপুট' },
  { key: 'view_sales',      label: 'সেলস রিপোর্ট দেখা' },
  { key: 'edit_sale',       label: 'সেল এডিট' },
  { key: 'view_due',        label: 'বকেয়া দেখা' },
  { key: 'reassign_due',    label: 'বকেয়া Reassign' },
  { key: 'view_staff',      label: 'স্টাফ দেখা' },
  { key: 'manage_staff',    label: 'স্টাফ তৈরি/edit' },
  { key: 'view_reports',    label: 'রিপোর্ট দেখা' },
  { key: 'manage_courses',  label: 'কোর্স/ব্যাচ manage' },
  { key: 'view_performance',label: 'পারফরম্যান্স দেখা' },
];

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [form, setForm] = useState({ name: '', label: '', level: 4, permissions: [] });

  const fetchRoles = () => {
    usersApi.getRoles().then(r => {
      const filtered = (r.data || []).filter(role => role.name !== 'super_admin');
      setRoles(filtered);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchRoles(); }, []);

  const togglePermission = (key) => {
    setForm(p => ({
      ...p,
      permissions: p.permissions.includes(key)
        ? p.permissions.filter(k => k !== key)
        : [...p.permissions, key]
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('Role name দিন');
    if (!form.label) return toast.error('Label দিন');
    try {
      const slugName = form.name.toLowerCase().replace(/\s+/g, '_');
      await usersApi.createRole({ ...form, name: slugName });
      toast.success('Role তৈরি হয়েছে ✅');
      setShowCreate(false);
      setForm({ name: '', label: '', level: 4, permissions: [] });
      fetchRoles();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await usersApi.updateRole(editRole.id, {
        label: form.label,
        permissions: form.permissions,
      });
      toast.success('Role আপডেট হয়েছে ✅');
      setEditRole(null);
      fetchRoles();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    }
  };

  const handleDelete = async (role) => {
    if (!confirm(`"${role.label}" role মুছে ফেলবেন?`)) return;
    try {
      await usersApi.deleteRole(role.id);
      toast.success('Role মুছে ফেলা হয়েছে');
      fetchRoles();
    } catch (err) {
      toast.error(err.message || 'System role মুছে ফেলা যাবে না');
    }
  };

  const openEdit = (role) => {
    setEditRole(role);
    setForm({
      label: role.label,
      permissions: role.permissions || [],
    });
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark">Role Management</h1>
          <p className="text-gray-500 text-sm">Dynamic role ও permission manage করুন</p>
        </div>
        <button onClick={() => { setShowCreate(true); setForm({ name: '', label: '', level: 4, permissions: [] }); }}
          className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
          <Plus size={18} /> নতুন Role
        </button>
      </div>

      {/* Roles list */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
        ) : roles.map(role => (
          <div key={role.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-dark">{role.label}</span>
                  {role.is_system && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">System</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Level: {role.level} • {role.name}</p>
              </div>
              {!role.is_system && (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(role)}
                    className="p-1.5 bg-primary-50 text-primary-600 rounded-lg">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(role)}
                    className="p-1.5 bg-red-50 text-red-500 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Permissions */}
            {role.permissions?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {role.permissions.map(p => {
                  const perm = ALL_PERMISSIONS.find(ap => ap.key === p);
                  return (
                    <span key={p} className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">
                      {perm?.label || p}
                    </span>
                  );
                })}
              </div>
            )}
            {role.is_system && (
              <p className="text-xs text-gray-400 mt-2">System role — সব permission আছে</p>
            )}
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <RoleModal
          title="নতুন Role তৈরি করুন"
          form={form}
          setForm={setForm}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          isNew={true}
          togglePermission={togglePermission}
        />
      )}

      {/* Edit Modal */}
      {editRole && (
        <RoleModal
          title={`"${editRole.label}" এডিট করুন`}
          form={form}
          setForm={setForm}
          onSubmit={handleUpdate}
          onClose={() => setEditRole(null)}
          isNew={false}
          togglePermission={togglePermission}
        />
      )}
    </div>
  );
}

function RoleModal({ title, form, setForm, onSubmit, onClose, isNew, togglePermission }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {isNew && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Role Name (English) *</label>
                <input className="input-field" placeholder="যেমন: general_manager"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                <p className="text-xs text-gray-400 mt-1">Lowercase, underscore দিয়ে লিখুন</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Level *</label>
                <select className="input-field" value={form.level}
                  onChange={e => setForm(p => ({ ...p, level: parseInt(e.target.value) }))}>
                  <option value={3}>৩ — Manager পর্যায়</option>
                  <option value={4}>৪ — Executive পর্যায়</option>
                  <option value={5}>৫ — Junior পর্যায়</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Label (বাংলায়) *</label>
            <input className="input-field" placeholder="যেমন: জেনারেল ম্যানেজার"
              value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Permissions *</label>
            <div className="space-y-2">
              {ALL_PERMISSIONS.map(perm => (
                <label key={perm.key} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.permissions?.includes(perm.key) || false}
                    onChange={() => togglePermission(perm.key)}
                    className="w-4 h-4 accent-primary-500"
                  />
                  <span className="text-sm">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary">
            {isNew ? '✅ Role তৈরি করুন' : '✅ আপডেট করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}
