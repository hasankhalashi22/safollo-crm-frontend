import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { format } from 'date-fns';
import { exportAccountingPdf } from '../../utils/accountingPdf';
import { Download } from 'lucide-react';
import SignatoryModal from '../../components/SignatoryModal';

const getFiscalYears = () => {
  const now = new Date();
  const s = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 4 }, (_, i) => ({ label: `${s - i}-${String(s - i + 1).slice(-2)}`, asOf: `${s - i + 1}-06-30` }));
};
const FISCAL_YEARS = getFiscalYears();

export default function BalanceSheet() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(FISCAL_YEARS[0].label);
  const [asOfDate, setAsOfDate] = useState(FISCAL_YEARS[0].asOf);
  const handleFYChange = (label) => { setFiscalYear(label); const fy = FISCAL_YEARS.find(f => f.label === label); if (fy) setAsOfDate(fy.asOf); };
  const [showSignModal, setShowSignModal] = useState(false);

  const fetchData = (date = asOfDate) => {
    setLoading(true);
    accountingApi.getBalanceSheet(date).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDownloadPdf = ({ mdName, ceoName }) => {
    if (!data) return;
    const period = `As of ${format(new Date(asOfDate), 'dd/MM/yyyy')}`;

    const assetRows = data.assets.map(a => `<tr><td>${a.name}</td><td>Tk ${Number(a.balance).toLocaleString()}</td></tr>`).join('');
    const liabilityRows = data.liabilities.map(l => `<tr><td>${l.name}</td><td>Tk ${Number(l.balance).toLocaleString()}</td></tr>`).join('');
    const equityRows = data.equity.map(e => `<tr><td>${e.name}</td><td>Tk ${Number(e.balance).toLocaleString()}</td></tr>`).join('');

    const tableHtml = `
      <table>
        <thead><tr><th colspan="2">Assets</th></tr></thead>
        <tbody>${assetRows || '<tr><td colspan="2">No assets</td></tr>'}</tbody>
        <tfoot><tr><td>Total Assets</td><td>Tk ${Number(data.total_assets).toLocaleString()}</td></tr></tfoot>
      </table>
      <table>
        <thead><tr><th colspan="2">Liabilities</th></tr></thead>
        <tbody>${liabilityRows || '<tr><td colspan="2">No liabilities</td></tr>'}</tbody>
        <tfoot><tr><td>Total Liabilities</td><td>Tk ${Number(data.total_liabilities).toLocaleString()}</td></tr></tfoot>
      </table>
      <table>
        <thead><tr><th colspan="2">Equity</th></tr></thead>
        <tbody>
          ${equityRows}
          <tr><td>Retained Earnings (Net Income)</td><td>Tk ${Number(data.net_income).toLocaleString()}</td></tr>
        </tbody>
        <tfoot><tr><td>Total Equity</td><td>Tk ${Number(data.total_equity).toLocaleString()}</td></tr></tfoot>
      </table>
      <table>
        <tfoot><tr><td style="font-size:14px">Total Liabilities + Equity</td><td style="font-size:14px">Tk ${Number(data.total_liabilities_and_equity).toLocaleString()}</td></tr></tfoot>
      </table>`;

    exportAccountingPdf({ title: 'Balance Sheet', period, tableHtml, mdName, ceoName });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">Balance Sheet</h1>

      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">অর্থবছর</label>
          <select className="input-field" value={fiscalYear} onChange={e => handleFYChange(e.target.value)}>
            {FISCAL_YEARS.map(fy => <option key={fy.label} value={fy.label}>FY {fy.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">As of Date</label>
          <input type="date" className="input-field" value={asOfDate} onChange={e => { setAsOfDate(e.target.value); setFiscalYear(''); }} />
        </div>
        <button onClick={() => fetchData()} className="btn-primary py-2.5 px-6">View</button>
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
              {data.is_balanced ? '✅ Balanced — Assets = Liabilities + Equity' : '⚠️ Not balanced!'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Assets */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">Assets</h3>
              {data.assets.length === 0 ? (
                <p className="text-gray-400 text-sm py-2">No assets</p>
              ) : data.assets.map(a => (
                <div key={a.id} className="flex justify-between py-1.5 text-sm">
                  <span className="text-gray-600">{a.name}{a.bank_name ? ` (${a.bank_name})` : ''}</span>
                  <span className={`font-medium ${a.balance < 0 ? 'text-red-500' : ''}`}>Tk {Number(a.balance).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-semibold">
                <span>Total Assets</span>
                <span className="text-primary-600">Tk {Number(data.total_assets).toLocaleString()}</span>
              </div>
            </div>

            {/* Liabilities + Equity */}
            <div className="card space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">Liabilities</h3>
                {data.liabilities.length === 0 ? (
                  <p className="text-gray-400 text-sm py-2">No liabilities</p>
                ) : data.liabilities.map(l => (
                  <div key={l.id} className="flex justify-between py-1.5 text-sm">
                    <span className="text-gray-600">{l.name}{l.bank_name ? ` (${l.bank_name})` : ''}</span>
                    <span className="font-medium">Tk {Number(l.balance).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-semibold">
                  <span>Total Liabilities</span>
                  <span className="text-orange-600">Tk {Number(data.total_liabilities).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">Equity</h3>
                {data.equity.map(e => (
                  <div key={e.id} className="flex justify-between py-1.5 text-sm">
                    <span className="text-gray-600">{e.name}</span>
                    <span className="font-medium">Tk {Number(e.balance).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1.5 text-sm">
                  <span className="text-gray-600">Retained Earnings (Net Income)</span>
                  <span className="font-medium">Tk {Number(data.net_income).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-semibold">
                  <span>Total Equity</span>
                  <span className="text-purple-600">Tk {Number(data.total_equity).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-primary-50 rounded-xl font-bold">
                <span>Total Liabilities + Equity</span>
                <span className="text-primary-600">Tk {Number(data.total_liabilities_and_equity).toLocaleString()}</span>
              </div>
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