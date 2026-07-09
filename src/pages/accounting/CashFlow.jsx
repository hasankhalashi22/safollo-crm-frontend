import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { format, startOfMonth } from 'date-fns';
import { exportAccountingPdf } from '../../utils/accountingPdf';
import { Download } from 'lucide-react';
import SignatoryModal from '../../components/SignatoryModal';

const getFiscalYears = () => {
  const now = new Date();
  const s = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 4 }, (_, i) => ({ label: `${s - i}-${String(s - i + 1).slice(-2)}`, from: `${s - i}-07-01`, to: `${s - i + 1}-06-30` }));
};
const FISCAL_YEARS = getFiscalYears();

export default function CashFlow() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(FISCAL_YEARS[0].label);
  const [dateFrom, setDateFrom] = useState(FISCAL_YEARS[0].from);
  const [dateTo, setDateTo] = useState(FISCAL_YEARS[0].to);
  const handleFYChange = (label) => { setFiscalYear(label); const fy = FISCAL_YEARS.find(f => f.label === label); if (fy) { setDateFrom(fy.from); setDateTo(fy.to); } };
  const [showSignModal, setShowSignModal] = useState(false);

  const fetchData = () => {
    setLoading(true);
    accountingApi.getCashFlow({ date_from: dateFrom, date_to: dateTo }).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDownloadPdf = ({ mdName, ceoName }) => {
    if (!data) return;
    const period = `${format(new Date(dateFrom), 'dd/MM/yyyy')} to ${format(new Date(dateTo), 'dd/MM/yyyy')}`;

    const opRows = data.operating_items.map(i => `<tr><td>${i.label}</td><td>Tk ${Number(i.amount).toLocaleString()}</td></tr>`).join('');
    const finRows = data.financing_items.map(i => `<tr><td>${i.label}</td><td>Tk ${Number(i.amount).toLocaleString()}</td></tr>`).join('');

    const tableHtml = `
      <table>
        <thead><tr><th colspan="2">Cash Flow from Operating Activities</th></tr></thead>
        <tbody>${opRows || '<tr><td colspan="2">No items</td></tr>'}</tbody>
        <tfoot><tr><td>Net Cash from Operating</td><td>Tk ${Number(data.net_operating).toLocaleString()}</td></tr></tfoot>
      </table>
      <table>
        <thead><tr><th colspan="2">Cash Flow from Financing Activities</th></tr></thead>
        <tbody>${finRows || '<tr><td colspan="2">No items</td></tr>'}</tbody>
        <tfoot><tr><td>Net Cash from Financing</td><td>Tk ${Number(data.net_financing).toLocaleString()}</td></tr></tfoot>
      </table>
      <table>
        <tbody>
          <tr><td>Net Increase/Decrease in Cash</td><td>Tk ${Number(data.net_change).toLocaleString()}</td></tr>
          <tr><td>Beginning Cash Balance</td><td>Tk ${Number(data.beginning_cash).toLocaleString()}</td></tr>
        </tbody>
        <tfoot><tr><td style="font-size:14px">Ending Cash Balance</td><td style="font-size:14px">Tk ${Number(data.ending_cash).toLocaleString()}</td></tr></tfoot>
      </table>`;

    exportAccountingPdf({ title: 'Statement of Cash Flows', period, tableHtml, mdName, ceoName });
  };

  const TYPE_LABELS_EN = {
    expense: 'Expense',
    salary_payment: 'Salary Payment',
    teacher_payment: 'Teacher Payment',
    steadfast_withdrawal: 'Steadfast Withdrawal',
    investor_payment: 'Investor Payment',
    credit_card_payment: 'Credit Card Payment',
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">Cash Flow Statement</h1>

      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">অর্থবছর</label>
          <select className="input-field" value={fiscalYear} onChange={e => handleFYChange(e.target.value)}>
            {FISCAL_YEARS.map(fy => <option key={fy.label} value={fy.label}>FY {fy.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Start Date</label>
          <input type="date" className="input-field" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setFiscalYear(''); }} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">End Date</label>
          <input type="date" className="input-field" value={dateTo} onChange={e => { setDateTo(e.target.value); setFiscalYear(''); }} />
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
          {/* Operating */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">Cash Flow from Operating Activities</h3>
            {data.operating_items.length === 0 ? (
              <p className="text-gray-400 text-sm py-2">No entries</p>
            ) : data.operating_items.map((i, idx) => (
              <div key={idx} className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-600">{i.label}</span>
                <span className={`font-medium ${i.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>Tk {Number(i.amount).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-semibold">
              <span>Net Cash from Operating</span>
              <span className={data.net_operating < 0 ? 'text-red-500' : 'text-green-600'}>Tk {Number(data.net_operating).toLocaleString()}</span>
            </div>
          </div>

          {/* Financing */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">Cash Flow from Financing Activities</h3>
            {data.financing_items.length === 0 ? (
              <p className="text-gray-400 text-sm py-2">No entries</p>
            ) : data.financing_items.map((i, idx) => (
              <div key={idx} className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-600">{i.label}</span>
                <span className="font-medium text-red-500">Tk {Number(i.amount).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-semibold">
              <span>Net Cash from Financing</span>
              <span className={data.net_financing < 0 ? 'text-red-500' : 'text-green-600'}>Tk {Number(data.net_financing).toLocaleString()}</span>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm">
              <span>Net Increase/Decrease in Cash</span>
              <span className={`font-semibold ${data.net_change < 0 ? 'text-red-500' : 'text-green-600'}`}>Tk {Number(data.net_change).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Beginning Cash Balance</span>
              <span className="font-semibold">Tk {Number(data.beginning_cash).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-primary-50 rounded-xl font-bold">
              <span>Ending Cash Balance</span>
              <span className="text-primary-600">Tk {Number(data.ending_cash).toLocaleString()}</span>
            </div>
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