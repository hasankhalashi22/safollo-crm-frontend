import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { format } from 'date-fns';
import { exportAccountingPdf } from '../../utils/accountingPdf';
import { Download } from 'lucide-react';

const TYPE_LABELS = {
  asset: 'সম্পদ', liability: 'দায়', equity: 'মালিকানা', revenue: 'আয়', expense: 'খরচ',
};

export default function TrialBalance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState('');

  const fetchData = (date = asOfDate) => {
    setLoading(true);
    accountingApi.getTrialBalance(date).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

const handleDownloadPdf = () => {
    if (!data) return;
    const period = asOfDate ? `শুরু থেকে ${format(new Date(asOfDate), 'dd/MM/yyyy')} পর্যন্ত` : `শুরু থেকে ${format(new Date(), 'dd/MM/yyyy')} পর্যন্ত (আজ)`;
    const rows = data.accounts.map(a => `
      <tr>
        <td>${a.code || '—'}</td>
        <td>${a.name}</td>
        <td>${TYPE_LABELS[a.account_type]}</td>
        <td>${a.debit_balance > 0 ? '৳' + Number(a.debit_balance).toLocaleString() : '—'}</td>
        <td>${a.credit_balance > 0 ? '৳' + Number(a.credit_balance).toLocaleString() : '—'}</td>
      </tr>`).join('');

    const tableHtml = `
      <table>
        <thead><tr><th>কোড</th><th>একাউন্টের নাম</th><th>টাইপ</th><th>Debit</th><th>Credit</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="3" style="text-align:right">সর্বমোট</td><td>৳${Number(data.total_debit).toLocaleString()}</td><td>৳${Number(data.total_credit).toLocaleString()}</td></tr>
        </tfoot>
      </table>`;

    exportAccountingPdf({ title: 'ট্রায়াল ব্যালেন্স (Trial Balance)', period, tableHtml });
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">ট্রায়াল ব্যালেন্স</h1>

      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">তারিখ পর্যন্ত (ঐচ্ছিক)</label>
          <input type="date" className="input-field" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} />
        </div>
       <button onClick={() => fetchData()} className="btn-primary py-2.5 px-6">দেখুন</button>
        <button onClick={() => { setAsOfDate(''); fetchData(''); }} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">রিসেট (আজ পর্যন্ত)</button>
        <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium ml-auto">
          <Download size={16} /> PDF
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
      ) : data ? (
        <>
          <div className={`card mb-4 ${data.is_balanced ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
            <p className={`font-semibold ${data.is_balanced ? 'text-green-600' : 'text-red-600'}`}>
              {data.is_balanced ? '✅ ব্যালেন্সড — Total Debit = Total Credit' : '⚠️ ব্যালেন্সড নয় — Debit ও Credit মিলছে না!'}
            </p>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['কোড', 'একাউন্টের নাম', 'টাইপ', 'Debit', 'Credit'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.accounts.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-gray-400">কোনো ডেটা নেই</td></tr>
                  ) : data.accounts.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{a.code || '—'}</td>
                      <td className="px-4 py-3 font-medium">{a.name}</td>
                      <td className="px-4 py-3 text-gray-500">{TYPE_LABELS[a.account_type]}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{a.debit_balance > 0 ? `৳${Number(a.debit_balance).toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{a.credit_balance > 0 ? `৳${Number(a.credit_balance).toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 font-bold text-right">সর্বমোট</td>
                    <td className="px-4 py-3 font-bold">৳{Number(data.total_debit).toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold">৳{Number(data.total_credit).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}