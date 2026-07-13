import { useState, useEffect } from 'react';
import { academyApi } from '../../api/client';
import { Search, X } from 'lucide-react';

const STATUS_LABEL = { scheduled: 'নির্ধারিত', done: 'সম্পন্ন', cancelled: 'বাতিল', rescheduled: 'পুনর্নির্ধারিত' };
const STATUS_COLOR = { scheduled: 'bg-blue-100 text-blue-700', done: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-600', rescheduled: 'bg-yellow-100 text-yellow-700' };
const DAY_LABELS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} '${String(dt.getFullYear()).slice(-2)}`;
}
function dayLabel(d) {
  if (!d) return '—';
  return DAY_LABELS[new Date(d).getDay()];
}

const EMPTY = { batch_id: '', teacher_id: '', row_type: '', date_from: '', date_to: '', subject_name: '' };

export default function ScheduleReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [zooms, setZooms] = useState([]);

  useEffect(() => {
    Promise.all([
      academyApi.getBatches(),
      academyApi.getTeachers(),
      academyApi.getZoomAccounts(),
    ]).then(([b, t, z]) => {
      setBatches(b.data || []);
      setTeachers(t.data || []);
      setZooms(z.data || []);
    });
    load(EMPTY);
  }, []);

  const load = (f) => {
    setLoading(true);
    const params = { ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), status: 'done', feedback_approved: true };
    academyApi.getScheduleReport(params)
      .then(r => setRows(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const apply = () => { setApplied(filters); load(filters); };
  const reset = () => { setFilters(EMPTY); setApplied(EMPTY); load(EMPTY); };
  const sf = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  const sel = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-primary-400 bg-white';
  const inp = 'w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-primary-400';

  return (
    <div className="p-3 md:p-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-800">ক্লাস রিপোর্ট</h1>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">ব্যাচ</label>
            <select className={sel} value={filters.batch_id} onChange={e => sf('batch_id', e.target.value)}>
              <option value="">সব ব্যাচ</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">শিক্ষক</label>
            <select className={sel} value={filters.teacher_id} onChange={e => sf('teacher_id', e.target.value)}>
              <option value="">সব শিক্ষক</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">স্ট্যাটাস</label>
            <select className={sel} disabled value="done">
              <option value="done">সম্পন্ন (ফিডব্যাক অনুমোদিত)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">ধরন</label>
            <select className={sel} value={filters.row_type} onChange={e => sf('row_type', e.target.value)}>
              <option value="">সব ধরন</option>
              <option value="class">ক্লাস</option>
              <option value="exam">পরীক্ষা</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">তারিখ থেকে</label>
            <input type="date" className={inp} value={filters.date_from} onChange={e => sf('date_from', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">তারিখ পর্যন্ত</label>
            <input type="date" className={inp} value={filters.date_to} onChange={e => sf('date_to', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">সাবজেক্ট</label>
            <input type="text" className={inp} value={filters.subject_name} onChange={e => sf('subject_name', e.target.value)} placeholder="সাবজেক্ট নাম..." />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={apply} className="flex-1 flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium py-2 rounded-xl transition-colors">
              <Search size={14} /> ফিল্টার
            </button>
            <button onClick={reset} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors" title="রিসেট">
              <X size={16} />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400">{rows.length} টি রেকর্ড পাওয়া গেছে</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">লোড হচ্ছে...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400">কোনো রেকর্ড নেই</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  {['ক্রম','তারিখ','বার','সময়','সাবজেক্ট','শিরোনাম','বিস্তারিত','জুম','শিক্ষক','ধরন','স্থান','স্ট্যাটাস','ব্যাচ'].map(h => (
                    <th key={h} className="px-3 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isExam = row.row_type === 'exam';
                  const d = (row.scheduled_date || '').split('T')[0];
                  const typeLabel = row.label
                    ? row.label
                    : isExam ? `এক্সাম-${row.exam_no || row.class_no || ''}` : `ক্লাস-${row.class_no || ''}`;
                  const zoom = zooms.find(z => z.id === row.zoom_account_id);
                  return (
                    <tr key={row.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isExam ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap text-gray-600">{fmtDate(d)}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{dayLabel(d)}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{row.scheduled_time || '—'}</td>
                      <td className="px-3 py-2 text-xs font-medium text-emerald-700 max-w-[100px] truncate" title={row.subject_name}>{row.subject_name || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-700 max-w-[130px] truncate" title={row.topic}>{row.topic || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-400 max-w-[110px] truncate" title={row.notes}>{row.notes || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{zoom?.account_name || row.zoom_account_name || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.teacher_name || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{row.class_mode === 'offline' ? 'অফলাইন' : 'অনলাইন'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{row.location || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[row.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABEL[row.status] || row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{row.batch_name || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
