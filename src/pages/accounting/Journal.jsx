import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { format } from 'date-fns';

export default function Journal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ date_from: '', date_to: '' });

  const fetchData = (f = filters) => {
    setLoading(true);
    const params = {};
    if (f.date_from) params.date_from = f.date_from;
    if (f.date_to) params.date_to = f.date_to;
    accountingApi.getJournal(params).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">General Journal</h1>

      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">From</label>
          <input type="date" className="input-field" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">To</label>
          <input type="date" className="input-field" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} />
        </div>
        <button onClick={() => fetchData()} className="btn-primary py-2.5 px-6">Search</button>
        <button onClick={() => { setFilters({ date_from: '', date_to: '' }); fetchData({ date_from: '', date_to: '' }); }}
          className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">Reset</button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Account', 'Description', 'Reference', 'Debit', 'Credit'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : !data || data.entries.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No entries</td></tr>
              ) : data.entries.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{format(new Date(e.entry_date), 'dd/MM/yy')}</td>
                  <td className="px-4 py-3 font-medium">
                    {e.account_code && <span className="text-gray-400 mr-1">{e.account_code}</span>}
                    {e.account_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.description || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{e.reference_no || '—'}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap text-green-600">
                    {e.entry_type === 'debit' ? `Tk ${Number(e.amount).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap text-red-600">
                    {e.entry_type === 'credit' ? `Tk ${Number(e.amount).toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}