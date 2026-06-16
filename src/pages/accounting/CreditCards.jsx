import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { Link } from 'react-router-dom';
import { format, startOfMonth } from 'date-fns';
import { CreditCard, Download } from 'lucide-react';
import { exportAccountingPdf } from '../../utils/accountingPdf';
import SignatoryModal from '../../components/SignatoryModal';

export default function CreditCards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showSignModal, setShowSignModal] = useState(false);

  const fetchData = () => {
    setLoading(true);
    accountingApi.getCreditCards({ date_from: dateFrom, date_to: dateTo }).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

const handleDownloadPdf = ({ mdName, ceoName }) => {
    if (!data) return;
    const period = `${format(new Date(dateFrom), 'dd/MM/yyyy')} to ${format(new Date(dateTo), 'dd/MM/yyyy')}`;

    const cardRows = data.cards.map(c => `
      <tr>
        <td>${c.name}${c.bank_name ? ' (' + c.bank_name + ')' : ''}</td>
        <td>Tk ${Number(c.total_credit_used).toLocaleString()}</td>
        <td>Tk ${Number(c.total_paid).toLocaleString()}</td>
        <td>Tk ${Number(c.outstanding_balance).toLocaleString()}</td>
        <td>Tk ${Number(c.period_charge).toLocaleString()}</td>
        <td>Tk ${Number(c.period_payment).toLocaleString()}</td>
      </tr>`).join('');

    const tableHtml = `
      <table>
        <thead><tr><th>Card</th><th>Total Credit Used</th><th>Total Paid</th><th>Outstanding</th><th>Credit Used (Period)</th><th>Paid (Period)</th></tr></thead>
        <tbody>${cardRows}</tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td>Tk ${Number(data.totals.total_credit_used).toLocaleString()}</td>
            <td>Tk ${Number(data.totals.total_paid).toLocaleString()}</td>
            <td>Tk ${Number(data.totals.outstanding_balance).toLocaleString()}</td>
            <td>Tk ${Number(data.totals.period_charge).toLocaleString()}</td>
            <td>Tk ${Number(data.totals.period_payment).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>`;

    exportAccountingPdf({ title: 'Credit Cards Overview', period, tableHtml, mdName, ceoName });
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">Credit Cards</h1>

      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">From</label>
          <input type="date" className="input-field" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">To</label>
          <input type="date" className="input-field" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
       <button onClick={fetchData} className="btn-primary py-2.5 px-6">View</button>
        <button onClick={() => setShowSignModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium ml-auto">
          <Download size={16} /> PDF
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
      ) : !data || data.cards.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No credit cards added yet</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {data.cards.map(card => (
              <div key={card.id} className="card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="font-semibold">{card.name}</p>
                    {card.bank_name && <p className="text-xs text-gray-400">{card.bank_name}</p>}
                  </div>
                </div>

<div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-purple-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Total Credit Used</p>
                    <p className="font-bold text-purple-600">Tk {Number(card.total_credit_used).toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Total Paid</p>
                    <p className="font-bold text-blue-600">Tk {Number(card.total_paid).toLocaleString()}</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Outstanding Balance</p>
                    <p className="font-bold text-orange-600">Tk {Number(card.outstanding_balance).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Interest Rate</p>
                    <p className="font-bold">{card.interest_rate ? `${card.interest_rate}%` : '—'}</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm py-2 border-t border-gray-100">
                  <span className="text-gray-500">Credit Used (Period)</span>
                  <span className="font-medium text-purple-600">Tk {Number(card.period_charge).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-t border-gray-100">
                  <span className="text-gray-500">Paid (Period)</span>
                  <span className="font-medium text-blue-600">Tk {Number(card.period_payment).toLocaleString()}</span>
                </div>

                <Link to="/accounting/ledger" className="block text-center mt-2 py-2 bg-primary-50 text-primary-600 rounded-xl text-sm font-medium">
                  View Ledger
                </Link>
              </div>
            ))}
          </div>

         {/* Totals */}
          <div className="card bg-primary-50">
            <h3 className="font-semibold text-gray-700 mb-3">All Cards Total</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Total Credit Used (All Time)</p>
                <p className="font-bold text-purple-600">Tk {Number(data.totals.total_credit_used).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Total Paid (All Time)</p>
                <p className="font-bold text-blue-600">Tk {Number(data.totals.total_paid).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Outstanding Balance</p>
                <p className="font-bold text-orange-600">Tk {Number(data.totals.outstanding_balance).toLocaleString()}</p>
              </div>
            </div>
          </div>
       </>
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