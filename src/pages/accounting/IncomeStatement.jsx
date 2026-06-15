import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { format, startOfMonth } from 'date-fns';
import { exportAccountingPdf } from '../../utils/accountingPdf';
import { Download } from 'lucide-react';
import SignatoryModal from '../../components/SignatoryModal';

export default function IncomeStatement() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showSignModal, setShowSignModal] = useState(false);

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

  const handleDownloadPdf = ({ mdName, ceoName }) => {
    if (!data) return;
    const period = `${format(new Date(dateFrom), 'dd/MM/yyyy')} to ${format(new Date(dateTo), 'dd/MM/yyyy')}`;

    const revenueRows = data.revenues.map(r => `<tr><td>${r.name}</td><td>Tk ${Number(r.amount).toLocaleString()}</td></tr>`).join('');
    const expenseRows = data.expenses.map(e => `<tr><td>${e.name}</td><td>Tk ${Number(e.amount).toLocaleString()}</td></tr>`).join('');

    const tableHtml = `
      <table>
        <thead><tr><th colspan="2">Revenue</th></tr></thead>
        <tbody>${revenueRows || '<tr><td colspan="2">No revenue</td></tr>'}</tbody>
        <tfoot><tr><td>Total Revenue</td><td>Tk ${Number(data.total_revenue).toLocaleString()}</td></tr></tfoot>
      </table>
      <table>
        <thead><tr><th colspan="2">Expenses</th></tr></thead>
        <tbody>${expenseRows || '<tr><td colspan="2">No expenses</td></tr>'}</tbody>
        <tfoot><tr><td>Total Expenses</td><td>Tk ${Number(data.total_expense).toLocaleString()}</td></tr></tfoot>
      </table>
      <table>
        <tfoot><tr><td style="font-size:14px">Net Income</td><td style="font-size:14px">Tk ${Number(data.net_income).toLocaleString()}</td></tr></tfoot>
      </table>`;

    exportAccountingPdf({ title: 'Income Statement', period, tableHtml, mdName, ceoName });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">Income Statement</h1>

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
        <div className="card space-y-4">
          {/* Revenue */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">Revenue</h3>
            {data.revenues.length === 0 ? (
              <p className="text-gray-400 text-sm py-2">No revenue</p>
            ) : data.revenues.map(r => (
              <div key={r.id} className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-600">{r.name}</span>
                <span className="font-medium">Tk {Number(r.amount).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-semibold">
              <span>Total Revenue</span>
              <span className="text-green-600">Tk {Number(data.total_revenue).toLocaleString()}</span>
            </div>
          </div>

          {/* Expenses */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">Expenses</h3>
            {data.expenses.length === 0 ? (
              <p className="text-gray-400 text-sm py-2">No expenses</p>
            ) : data.expenses.map(e => (
              <div key={e.id} className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-600">{e.name}</span>
                <span className="font-medium">Tk {Number(e.amount).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-semibold">
              <span>Total Expenses</span>
              <span className="text-red-600">Tk {Number(data.total_expense).toLocaleString()}</span>
            </div>
          </div>

          {/* Net Income */}
          <div className={`flex justify-between items-center p-4 rounded-xl ${data.net_income >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <span className="font-bold text-lg">Net Income</span>
            <span className={`font-bold text-2xl ${data.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Tk {Number(data.net_income).toLocaleString()}
            </span>
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