import { useState, useEffect } from 'react';
import { attendanceApi } from '../../api/client';
import { format } from 'date-fns';

export default function PortalAttendance() {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    Promise.all([
      attendanceApi.getMyHistory(month, year),
      attendanceApi.getMySummary(month, year),
    ]).then(([h, s]) => {
      setHistory(h.data || []);
      setSummary(s.data || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [month, year]);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-dark">আমার Attendance</h1>

      <div className="flex gap-2">
        <select className="input-field" value={month} onChange={e => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{format(new Date(2000, m - 1), 'MMMM')}</option>
          ))}
        </select>
        <select className="input-field max-w-[100px]" value={year} onChange={e => setYear(Number(e.target.value))}>
          {[year - 1, year].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-2">
          <div className="card text-center py-3">
            <p className="text-2xl font-bold text-primary-600">{summary.present_days}</p>
            <p className="text-xs text-gray-400">উপস্থিত দিন</p>
          </div>
          <div className="card text-center py-3">
            <p className="text-2xl font-bold text-amber-500">{summary.late_days}</p>
            <p className="text-xs text-gray-400">দেরি দিন</p>
          </div>
          <div className="card text-center py-3">
            <p className="text-2xl font-bold text-gray-700">{Number(summary.total_hours).toFixed(0)}</p>
            <p className="text-xs text-gray-400">মোট ঘণ্টা</p>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {history.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">কোনো রেকর্ড নেই</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map(h => (
              <div key={h.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{format(new Date(h.date), 'dd MMM, yyyy')}</p>
                  <p className="text-xs text-gray-400">
                    {h.check_in_time ? format(new Date(h.check_in_time), 'hh:mm a') : '—'}
                    {' → '}
                    {h.check_out_time ? format(new Date(h.check_out_time), 'hh:mm a') : '—'}
                  </p>
                </div>
                {h.is_late ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">দেরি</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">সময়মতো</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}