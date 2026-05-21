import { useState, useEffect } from 'react';
import { salesApi, coursesApi } from '../../api/client';
import { format } from 'date-fns';
import { Search, Filter } from 'lucide-react';

const STATUS_LABELS = { paid: { label: 'পেইড', cls: 'badge-paid' }, due: { label: 'বকেয়া', cls: 'badge-due' }, partial: { label: 'আংশিক', cls: 'badge-partial' } };

export default function AdminSales() {
  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ search: '', course_id: '', payment_status: '', date_from: '', date_to: '' });

  const fetchSales = (f = filters) => {
    setLoading(true);
    salesApi.getAll({ ...f }).then(res => {
      setSales(res.data || []);
      setTotal(res.total || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    coursesApi.getAll().then(r => setCourses(r.data || []));
    fetchSales();
  }, []);

  const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark">সেলস রিপোর্ট</h1>
          <p className="text-gray-500 text-sm">মোট {total}টি রেকর্ড</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">ফিল্টার</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
            <input className="input-field pl-9" placeholder="ফোন বা নাম" value={filters.search}
              onChange={e => setFilter('search', e.target.value)} />
          </div>
          <select className="input-field" value={filters.course_id} onChange={e => setFilter('course_id', e.target.value)}>
            <option value="">সব কোর্স</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input-field" value={filters.payment_status} onChange={e => setFilter('payment_status', e.target.value)}>
            <option value="">সব স্ট্যাটাস</option>
            <option value="paid">পেইড</option>
            <option value="due">বকেয়া</option>
            <option value="partial">আংশিক</option>
          </select>
          <button onClick={() => fetchSales()} className="btn-primary py-2">খুঁজুন</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" className="input-field" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} />
          <input type="date" className="input-field" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['তারিখ', 'স্টুডেন্ট', 'কোর্স', 'মূল্য', 'সংগৃহীত', 'বাকি', 'স্ট্যাটাস', 'Executive'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">লোড হচ্ছে...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">কোনো রেকর্ড নেই</td></tr>
              ) : sales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(s)}>
                  <td className="px-4 py-3 text-gray-500">{format(new Date(s.created_at), 'dd/MM/yy')}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.student_name || '—'}</p>
                    <p className="text-xs text-gray-400">{s.student_phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{s.course_name}</p>
                    <p className="text-xs text-gray-400">{s.batch_name}</p>
                  </td>
                  <td className="px-4 py-3">৳{Number(s.course_price).toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">৳{Number(s.total_collected).toLocaleString()}</td>
                  <td className="px-4 py-3 text-red-600">৳{Number(s.due_amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={STATUS_LABELS[s.payment_status]?.cls || 'badge-due'}>
                      {STATUS_LABELS[s.payment_status]?.label || s.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.executive_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-lg">সেল বিস্তারিত</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 bg-gray-100 rounded-full">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <Row label="স্টুডেন্ট" value={selected.student_name || '—'} />
              <Row label="ফোন" value={selected.student_phone} />
              <Row label="কোর্স" value={`${selected.course_name} ${selected.batch_name ? '• ' + selected.batch_name : ''}`} />
              <Row label="কোর্স মূল্য" value={`৳${Number(selected.course_price).toLocaleString()}`} />
              <Row label="সংগৃহীত" value={`৳${Number(selected.total_collected).toLocaleString()}`} />
              <Row label="বাকি" value={`৳${Number(selected.due_amount || 0).toLocaleString()}`} />
              <Row label="Executive" value={selected.executive_name || '—'} />
              {selected.reference && <Row label="রেফারেন্স" value={selected.reference} />}

              {selected.payment_history?.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700 mb-2">পেমেন্ট ইতিহাস</p>
                  {selected.payment_history.map((p, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 mb-2">
                      <div className="flex justify-between">
                        <span className="font-medium">৳{Number(p.amount).toLocaleString()}</span>
                        <span className="text-gray-400 text-xs">{format(new Date(p.created_at), 'dd/MM/yy HH:mm')}</span>
                      </div>
                      <p className="text-xs text-gray-500">{p.payment_method} {p.transaction_id ? '• ' + p.transaction_id : ''}</p>
                      {p.payment_proof_url && (
                        <a href={p.payment_proof_url} target="_blank" rel="noreferrer" className="text-xs text-primary-500 underline">প্রুফ দেখুন</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-gray-50 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
