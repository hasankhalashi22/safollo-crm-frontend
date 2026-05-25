import { useState, useEffect } from 'react';
import { auditApi, usersApi } from '../../api/client';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ACTION_LABELS = {
  CREATE:   { label: 'তৈরি',     cls: 'bg-green-100 text-green-700' },
  UPDATE:   { label: 'আপডেট',   cls: 'bg-blue-100 text-blue-700' },
  DELETE:   { label: 'Delete',   cls: 'bg-red-100 text-red-700' },
  REASSIGN: { label: 'Reassign', cls: 'bg-yellow-100 text-yellow-700' },
  LOGIN:    { label: 'Login',    cls: 'bg-purple-100 text-purple-700' },
};

const MODULE_LABELS = {
  sales:   'সেলস',
  staff:   'স্টাফ',
  course:  'কোর্স',
  payment: 'পেমেন্ট',
  auth:    'Login',
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    module: '', action: '', user_id: '', date_from: '', date_to: '',
  });
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetchLogs = (f = filters, p = page) => {
    setLoading(true);
    const params = { page: p, limit };
    if (f.module) params.module = f.module;
    if (f.action) params.action = f.action;
    if (f.user_id) params.user_id = f.user_id;
    if (f.date_from) params.date_from = f.date_from;
    if (f.date_to) params.date_to = f.date_to;

    auditApi.getLogs(params).then(r => {
      setLogs(r.data || []);
      setTotal(r.total || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
    usersApi.getAll().then(r => setUsers(r.data || []));
  }, []);

  const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  const handleExport = () => {
    if (logs.length === 0) return toast.error('কোনো ডেটা নেই');
    const headers = ['সময়', 'কে', 'পদ', 'কাজ', 'Module', 'বিবরণ'];
    const rows = logs.map(l => [
      format(new Date(l.created_at), 'dd/MM/yyyy HH:mm'),
      l.user_name || '—',
      l.user_role || '—',
      ACTION_LABELS[l.action]?.label || l.action,
      MODULE_LABELS[l.module] || l.module,
      l.description || '—',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_log_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Download হয়েছে ✅');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark">Activity Log</h1>
          <p className="text-gray-500 text-sm">মোট {total}টি কার্যক্রম</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
          ⬇️ Download
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <select className="input-field" value={filters.module} onChange={e => setFilter('module', e.target.value)}>
            <option value="">সব Module</option>
            <option value="sales">সেলস</option>
            <option value="staff">স্টাফ</option>
            <option value="course">কোর্স</option>
            <option value="payment">পেমেন্ট</option>
            <option value="auth">Login</option>
          </select>
          <select className="input-field" value={filters.action} onChange={e => setFilter('action', e.target.value)}>
            <option value="">সব Action</option>
            <option value="CREATE">তৈরি</option>
            <option value="UPDATE">আপডেট</option>
            <option value="DELETE">Delete</option>
            <option value="REASSIGN">Reassign</option>
            <option value="LOGIN">Login</option>
          </select>
          <select className="input-field" value={filters.user_id} onChange={e => setFilter('user_id', e.target.value)}>
            <option value="">সব User</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.phone}</option>)}
          </select>
          <input type="date" className="input-field" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} />
          <input type="date" className="input-field" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} />
        </div>
        <button onClick={() => { setPage(1); fetchLogs(filters, 1); }}
          className="btn-primary py-2 max-w-xs mt-3">খুঁজুন</button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['সময়', 'কে করেছে', 'পদ', 'কাজ', 'Module', 'বিবরণ'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">লোড হচ্ছে...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">কোনো log নেই</td></tr>
            ) : logs.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {format(new Date(l.created_at), 'dd/MM/yy HH:mm')}
                </td>
                <td className="px-4 py-3 font-medium">{l.user_name || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{l.user_role || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_LABELS[l.action]?.cls || 'bg-gray-100 text-gray-600'}`}>
                    {ACTION_LABELS[l.action]?.label || l.action}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {MODULE_LABELS[l.module] || l.module}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{l.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">{total}টির মধ্যে {(page-1)*limit+1}-{Math.min(page*limit, total)} দেখাচ্ছে</p>
          <div className="flex gap-2">
            <button onClick={() => { setPage(p => p-1); fetchLogs(filters, page-1); }}
              disabled={page === 1}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50">
              আগে
            </button>
            <button onClick={() => { setPage(p => p+1); fetchLogs(filters, page+1); }}
              disabled={page * limit >= total}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-50">
              পরে
            </button>
          </div>
        </div>
      )}
    </div>
  );
}