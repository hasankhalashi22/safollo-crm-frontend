import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { TrendingUp, X, Download } from 'lucide-react';
import { exportAccountingPdf } from '../../utils/accountingPdf';
import SignatoryModal from '../../components/SignatoryModal';

export default function Investors() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyModal, setHistoryModal] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);

  const fetchData = () => {
    setLoading(true);
    accountingApi.getInvestors().then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggle = async (inv) => {
    try {
      await accountingApi.toggleInvestorAccrual(inv.id, !inv.is_accruing);
      toast.success(!inv.is_accruing ? 'Accrual enabled ✅' : 'Accrual stopped');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    }
  };

const handleDownloadPdf = ({ mdName, ceoName }) => {
    if (!data) return;
    const period = `As of ${format(new Date(), 'dd/MM/yyyy')}`;

    const invRows = data.investors.map(inv => `
      <tr>
        <td>${inv.investor_name || inv.name}</td>
        <td>Tk ${Number(inv.initial_investment).toLocaleString()}</td>
        <td>Tk ${Number(inv.total_principal_repaid).toLocaleString()}</td>
        <td>Tk ${Number(inv.principal).toLocaleString()}</td>
        <td>Tk ${Number(inv.accrued_profit).toLocaleString()}</td>
        <td>Tk ${Number(inv.total_profit_paid).toLocaleString()}</td>
      </tr>`).join('');

    const tableHtml = `
      <table>
        <thead><tr><th>Investor</th><th>Invested</th><th>Repaid</th><th>Outstanding</th><th>Accrued (Due)</th><th>Profit Paid</th></tr></thead>
        <tbody>${invRows}</tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td>Tk ${Number(data.totals.total_invested).toLocaleString()}</td>
            <td>Tk ${Number(data.totals.total_repaid).toLocaleString()}</td>
            <td>Tk ${Number(data.totals.total_principal).toLocaleString()}</td>
            <td>Tk ${Number(data.totals.total_accrued).toLocaleString()}</td>
            <td>Tk ${Number(data.totals.total_paid).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>`;

    exportAccountingPdf({ title: 'Investors Overview', period, tableHtml, mdName, ceoName });
  };

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  return (
   <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-dark">Investors</h1>
        <button onClick={() => setShowSignModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium">
          <Download size={16} /> PDF
        </button>
      </div>

      {!data || data.investors.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No investors added yet</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {data.investors.map(inv => (
              <div key={inv.id} className="card cursor-pointer hover:shadow-md transition-all" onClick={() => setHistoryModal(inv)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <p className="font-semibold">{inv.investor_name || inv.name}</p>
                      {inv.profit_rate && <p className="text-xs text-gray-400">Annual Profit Rate: {inv.profit_rate}%</p>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleToggle(inv); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${inv.is_accruing ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                    {inv.is_accruing ? '● Accruing' : '○ Stopped'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Initial Investment</p>
                    <p className="font-bold">Tk {Number(inv.initial_investment).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Principal Repaid</p>
                    <p className="font-bold">Tk {Number(inv.total_principal_repaid).toLocaleString()}</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Outstanding Principal</p>
                    <p className="font-bold text-orange-600">Tk {Number(inv.principal).toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Accrued Profit (Due)</p>
                    <p className="font-bold text-amber-600">Tk {Number(inv.accrued_profit).toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Total Profit Paid</p>
                    <p className="font-bold text-blue-600">Tk {Number(inv.total_profit_paid).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Days Accrued</p>
                    <p className="font-bold">{inv.days_accrued} days</p>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-gray-500 border-t border-gray-100 pt-2">
                  {inv.contract_start_date && (
                    <div className="flex justify-between">
                      <span>Contract Start</span>
                      <span>{format(new Date(inv.contract_start_date), 'dd/MM/yyyy')}</span>
                    </div>
                  )}
                  {inv.contract_end_date && (
                    <div className="flex justify-between">
                      <span>Contract End</span>
                      <span>{format(new Date(inv.contract_end_date), 'dd/MM/yyyy')}</span>
                    </div>
                  )}
                  {inv.last_payment_date && (
                    <div className="flex justify-between">
                      <span>Last Profit Payment</span>
                      <span>{format(new Date(inv.last_payment_date), 'dd/MM/yyyy')}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-primary-500 text-center mt-2">Click to view full transaction history →</p>
              </div>
            ))}
          </div>

         {/* Totals */}
          <div className="card bg-primary-50">
            <h3 className="font-semibold text-gray-700 mb-3">All Investors Total</h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Total Invested (All Time)</p>
                <p className="font-bold">Tk {Number(data.totals.total_invested).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Total Principal Repaid</p>
                <p className="font-bold text-orange-600">Tk {Number(data.totals.total_repaid).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Outstanding Principal</p>
                <p className="font-bold">Tk {Number(data.totals.total_principal).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Total Accrued (Due)</p>
                <p className="font-bold text-amber-600">Tk {Number(data.totals.total_accrued).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Total Profit Paid</p>
                <p className="font-bold text-blue-600">Tk {Number(data.totals.total_paid).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {historyModal && createPortal(
        <HistoryModal investor={historyModal} onClose={() => setHistoryModal(null)} />,
        document.body
      )}

      {showSignModal && (
        <SignatoryModal
          onClose={() => setShowSignModal(false)}
          onConfirm={(names) => { setShowSignModal(false); handleDownloadPdf(names); }}
        />
      )}
    </div>
  );
}

function HistoryModal({ investor, onClose }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountingApi.getInvestorHistory(investor.id).then(r => {
      setHistory(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [investor.id]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-5">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">{investor.investor_name || investor.name} — Transaction History</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full"><X size={16} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
        ) : !history || history.entries.length === 0 ? (
          <p className="text-center py-12 text-gray-400">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Date', 'Type', 'Description', 'Deposit', 'Repayment', 'Profit Paid', 'Proof'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.entries.map(e => {
                  const isProfit = e.kind === 'profit';
                  const isDeposit = !isProfit && e.entry_type === 'credit';
                  const isRepayment = !isProfit && e.entry_type === 'debit';
                  return (
                    <tr key={`${e.kind}-${e.id}`} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{format(new Date(e.entry_date), 'dd/MM/yyyy')}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isProfit ? 'bg-amber-50 text-amber-600' : isDeposit ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                          {isProfit ? 'Profit Payment' : isDeposit ? 'Deposit' : 'Principal Repayment'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{e.description || '—'}</td>
                      <td className="px-3 py-2 text-green-600 font-medium whitespace-nowrap">
                        {isDeposit ? `Tk ${Number(e.amount).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-orange-600 font-medium whitespace-nowrap">
                        {isRepayment ? `Tk ${Number(e.amount).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-amber-600 font-medium whitespace-nowrap">
                        {isProfit ? `Tk ${Number(e.amount).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {e.proof_url ? (
                          <a href={e.proof_url} target="_blank" rel="noreferrer" className="text-primary-500 underline text-xs">View</a>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}