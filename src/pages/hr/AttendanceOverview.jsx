import { useState, useEffect } from 'react';
import { attendanceApi } from '../../api/client';
import { format } from 'date-fns';

export default function AttendanceOverview() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    attendanceApi.getAll(date).then(r => {
      setRecords(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [date]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-dark">Attendance Overview</h1>
        <input type="date" className="input-field max-w-[180px]" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['নাম', 'বিভাগ', 'Check-in', 'Check-out', 'কাজের সময়', 'স্ট্যাটাস'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">এই দিনে কোনো attendance রেকর্ড নেই</td></tr>
                ) : records.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.full_name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.department || '—'}</td>
                    <td className="px-4 py-3">
                      {r.check_in_time ? format(new Date(r.check_in_time), 'hh:mm a') : '—'}
                      {r.is_late && <span className="text-xs text-red-500 ml-1">({r.late_by_minutes} মিনিট দেরি)</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.check_out_time ? format(new Date(r.check_out_time), 'hh:mm a') : '—'}
                      {r.is_early_leave && <span className="text-xs text-amber-500 ml-1">({r.early_by_minutes} মিনিট আগে)</span>}
                    </td>
                    <td className="px-4 py-3">{r.working_hours ? `${r.working_hours} ঘণ্টা` : '—'}</td>
                    <td className="px-4 py-3">
                      {r.is_late ? (
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
      )}
    </div>
  );
}