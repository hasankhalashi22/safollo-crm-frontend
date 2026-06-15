import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { format, startOfMonth } from 'date-fns';
import { exportAccountingPdf } from '../../utils/accountingPdf';
import { Download } from 'lucide-react';
import SignatoryModal from '../../components/SignatoryModal';

export default function EquityStatement() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showSignModal, setShowSignModal] = useState(false);

  const fetchData = () => {
    setLoading(true);
    accountingApi.getEquityStatement({ date_from: dateFrom, date_to: dateTo }).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDownloadPdf = ({ mdName, ceoName }) => {
    if (!data) return;
    const period = `${format(new Date(dateFrom), 'dd/MM/yyyy')} to ${format(new Date(dateTo), 'dd/MM/yyyy')}`;

    const accountRows = data.equity_account_changes.map(a => `
      <tr>
        <td>${a.name}</td>
        <td>Tk ${Number(a.beginning).toLocaleString()}</td>
        <td>Tk ${Number(a.change).toLocaleString()}</td>
        <td>Tk ${Number(a.ending).toLocaleString()}</td>
      </tr>`).join('');

    const tableHtml = `
      <table>
        <thead><tr><th>Equity Component</th><th>Beginning</th><th>Change</th><th>Ending</th></tr></thead>
        <tbody>
          ${accountRows}
          <tr>
            <td>Retained Earnings</td>
            <td>Tk ${Number(data.beginning_retained_earnings).toLocaleString()}</td>
            <td>Tk ${Number(data.net_income_period).toLocaleString()}</td>
            <td>Tk ${Number(data.ending_retained_earnings).toLocaleString()}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>Total Equity</td>
            <td>Tk ${Number(data.beginning_total_equity).toLocaleString()}</td>
            <td>Tk ${Number(data.ending_total_equity - data.beginning_total_equity).toLocaleString()}</td>
            <td>Tk ${Number(data.ending_total_equity).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>`;

    exportAccountingPdf({ title: 'Statement of Changes in Equity', period, tableHtml, mdName, ceoName });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">Statement of Changes in Equity</h1>

      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">Start Date</label>
          <input type="date" className="input-field" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">End Date</label>
          <input type="date" className="input-field" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <button onClick={fetchData} className="btn-primary py-2.5 px-6">View</button>
        <button onClick={() => setShowSignModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium ml-auto">
          <Download size={16} /> PDF
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
      ) : data ? (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Equity Component', 'Beginning', 'Change', 'Ending'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.equity_account_changes.map((a, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3">Tk {Number(a.beginning).toLocaleString()}</td>
                    <td className={`px-4 py-3 ${a.change < 0 ? 'text-red-500' : a.change > 0 ? 'text-green-600' : ''}`}>Tk {Number(a.change).toLocaleString()}</td>
                    <td className="px-4 py-3">Tk {Number(a.ending).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">Retained Earnings</td>
                  <td className="px-4 py-3">Tk {Number(data.beginning_retained_earnings).toLocaleString()}</td>
                  <td className={`px-4 py-3 ${data.net_income_period < 0 ? 'text-red-500' : 'text-green-600'}`}>Tk {Number(data.net_income_period).toLocaleString()}</td>
                  <td className="px-4 py-3">Tk {Number(data.ending_retained_earnings).toLocaleString()}</td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td className="px-4 py-3 font-bold">Total Equity</td>
                  <td className="px-4 py-3 font-bold">Tk {Number(data.beginning_total_equity).toLocaleString()}</td>
                  <td className={`px-4 py-3 font-bold ${(data.ending_total_equity - data.beginning_total_equity) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    Tk {Number(data.ending_total_equity - data.beginning_total_equity).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-bold">Tk {Number(data.ending_total_equity).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
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