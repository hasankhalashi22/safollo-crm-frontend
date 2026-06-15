import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { format, startOfMonth } from 'date-fns';

export default function IncomeStatement() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchData = () => {
    setLoading(true);
    const params = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    accountingApi.getIncomeStatement(params).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">আয়-ব্যয় বিবরণী (Income Statement)</h1>

      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">শুরুর তারিখ</label>
          <input type="date" className="input-field" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">শেষ তারিখ</label>
          <input type="date" className="input-field" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <button onClick={fetchData} className="btn-primary py-2.5 px-6">দেখুন</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
      ) : data ? (
        <div className="card space-y-4">
          {/* Revenue */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">আয় (Revenue)</h3>
            {data.revenues.length === 0 ? (
              <p className="text-gray-400 text-sm py-2">কোনো আয় নেই</p>
            ) : data.revenues.map(r => (
              <div key={r.id} className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-600">{r.name}</span>
                <span className="font-medium">৳{Number(r.amount).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-semibold">
              <span>মোট আয়</span>
              <span className="text-green-600">৳{Number(data.total_revenue).toLocaleString()}</span>
            </div>
          </div>

          {/* Expenses */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">খরচ (Expenses)</h3>
            {data.expenses.length === 0 ? (
              <p className="text-gray-400 text-sm py-2">কোনো খরচ নেই</p>
            ) : data.expenses.map(e => (
              <div key={e.id} className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-600">{e.name}</span>
                <span className="font-medium">৳{Number(e.amount).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-semibold">
              <span>মোট খরচ</span>
              <span className="text-red-600">৳{Number(data.total_expense).toLocaleString()}</span>
            </div>
          </div>

          {/* Net Income */}
          <div className={`flex justify-between items-center p-4 rounded-xl ${data.net_income >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <span className="font-bold text-lg">নেট লাভ/ক্ষতি (Net Income)</span>
            <span className={`font-bold text-2xl ${data.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ৳{Number(data.net_income).toLocaleString()}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}