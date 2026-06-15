import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { format } from 'date-fns';
import { exportAccountingPdf } from '../../utils/accountingPdf';
import { Download } from 'lucide-react';
import SignatoryModal from '../../components/SignatoryModal';

const TYPE_LABELS = {
  asset: 'Asset', liability: 'Liability', equity: 'Equity', revenue: 'Revenue', expense: 'Expense',
};

export default function TrialBalance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState('');
  const [showSignModal, setShowSignModal] = useState(false);

  const fetchData = (date = asOfDate) => {
    setLoading(true);
    accountingApi.getTrialBalance(date).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDownloadPdf = ({ mdName, ceoName }) => {
    if (!data) return;
    const period = asOfDate ? `Inception to ${format(new Date(asOfDate), 'dd/MM/yyyy')}` : `Inception to ${format(new Date(), 'dd/MM/yyyy')} (Today)`;
    const rows = data.accounts.map(a => `
      <tr>
        <td>${a.code || '—'}</td>
        <td>${a.name}</td>
        <td>${TYPE_LABELS[a.account_type]}</td>
        <td>${a.debit_balance > 0 ? 'Tk ' + Number(a.debit_balance).toLocaleString() : '—'}</td>
        <td>${a.credit_balance > 0 ? 'Tk ' + Number(a.credit_balance).toLocaleString() : '—'}</td>
      </tr>`).join('');

    const tableHtml = `
      <table>
        <thead><tr><th>Code</th><th>Account Name</th><th>Type</th><th>Debit</th><th>Credit</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="3" style="text-align:right">Total</td><td>Tk ${Number(data.total_debit).toLocaleString()}</td><td>Tk ${Number(data.total_credit).toLocaleString()}</td></tr>
        </tfoot>
      </table>`;

    exportAccountingPdf({ title: 'Trial Balance', period, tableHtml, mdName, ceoName });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">Trial Balance</h1>

      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">As of Date (optional)</label>
          <input type="date" className="input-field" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} />
        </div>
        <button onClick={() => fetchData()} className="btn-primary py-2.5 px-6">View</button>
        <button onClick={() => { setAsOfDate(''); fetchData(''); }} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">Reset (Today)</button>
        <button onClick={() => setShowSignModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium ml-auto">
          <Download size={16} /> PDF
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
      ) : data ? (
        <>
          <div className={`card mb-4 ${data.is_balanced ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
            <p className={`font-semibold ${data.is_balanced ? 'text-green-600' : 'text-red-600'}`}>
              {data.is_balanced ? '✅ Balanced — Total Debit = Total Credit' : '⚠️ Not balanced — Debit and Credit do not match!'}
            </p>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Code', 'Account Name', 'Type', 'Debit', 'Credit'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.accounts.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-gray-400">No data</td></tr>
                  ) : data.accounts.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{a.code || '—'}</td>
                      <td className="px-4 py-3 font-medium">{a.name}</td>
                      <td className="px-4 py-3 text-gray-500">{TYPE_LABELS[a.account_type]}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{a.debit_balance > 0 ? `Tk ${Number(a.debit_balance).toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{a.credit_balance > 0 ? `Tk ${Number(a.credit_balance).toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 font-bold text-right">Total</td>
                    <td className="px-4 py-3 font-bold">Tk {Number(data.total_debit).toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold">Tk {Number(data.total_credit).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {showSignModal && (
        <SignatoryModal
          onClose={() => setShowSignModal(false)}
          onConfirm={(names) => { setShowSignModal(false); handleDownloadPdf(names); }}
        />
      )}
    </div>
  );
}