import { useState, useEffect } from 'react';
import { attendanceApi, hrApi } from '../../api/client';
import { format } from 'date-fns';
import { RotateCcw } from 'lucide-react';

const today = new Date().toISOString().split('T')[0];

export default function AttendanceOverview() {
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [employeeId, setEmployeeId] = useState('');
  const [status, setStatus] = useState('');
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hrApi.getEmployees().then(r => setEmployees(r.data || []));
  }, []);

  const fetchRecords = () => {
    setLoading(true);
    attendanceApi.getAll({ dateFrom, dateTo, employeeId, status }).then(r => {
      setRecords(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchRecords(); }, [dateFrom, dateTo, employeeId, status]);

  const handleReset = () => {
    setDateFrom(today);
    setDateTo(today);
    setEmployeeId('');
    setStatus('');
  };

  // Group by date for day-wise display
  const byDate = {};
  records.forEach(r => {
    const d = r.date.split('T')[0];
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(r);
  });
  const dates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-4">Attendance Overview</h1>

      <div className="card mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-500">কর্মী</label>
            <select className="input-field" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
              <option value="">-- সবাই --</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.full_name} {e.phone ? `— ${e.phone}` : ''} {e.department ? `(${e.department})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-500">তারিখ থেকে</label>
            <input type="date" className="input-field" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-500">তারিখ পর্যন্ত</label>
            <input type="date" className="input-field" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-500">স্ট্যাটাস</label>
            <select className="input-field" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">-- সব --</option>
              <option value="late">দেরি</option>
              <option value="on_time">সময়মতো</option>
              <option value="absent">অনুপস্থিত</option>
            </select>
          </div>
          <button onClick={handleReset}
            className="flex items-center justify-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-2.5 rounded-xl text-sm font-medium">
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
      ) : dates.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">কোনো attendance রেকর্ড নেই</div>
      ) : (
        <div className="space-y-6">
          {dates.map(d => (
            <div key={d} className="card">
              <h3 className="font-semibold text-gray-700 mb-3">{format(new Date(d), 'dd MMMM, yyyy')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['নাম', 'বিভাগ', 'Check-in', 'Check-out', 'কাজের সময়', 'স্ট্যাটাস'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {byDate[d].map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{r.full_name}</td>
                        <td className="px-3 py-2 text-gray-500">{r.department || '—'}</td>
                        <td className="px-3 py-2">
                          {r.check_in_time ? format(new Date(r.check_in_time), 'hh:mm a') : '—'}
                          {r.is_late && <span className="text-xs text-red-500 ml-1">({r.late_by_minutes} মিনিট দেরি)</span>}
                        </td>
                        <td className="px-3 py-2">
                          {r.check_out_time ? format(new Date(r.check_out_time), 'hh:mm a') : '—'}
                          {r.is_early_leave && <span className="text-xs text-amber-500 ml-1">({r.early_by_minutes} মিনিট আগে)</span>}
                        </td>
                        <td className="px-3 py-2">{r.working_hours ? `${r.working_hours} ঘণ্টা` : '—'}</td>
                        <td className="px-3 py-2">
                          {!r.check_in_time ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">অনুপস্থিত</span>
                          ) : r.is_late ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">দেরি</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">সময়মতো</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}