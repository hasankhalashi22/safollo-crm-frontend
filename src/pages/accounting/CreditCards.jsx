import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { format } from 'date-fns';
import { CreditCard, X, Download } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { exportAccountingPdf } from '../../utils/accountingPdf';
import SignatoryModal from '../../components/SignatoryModal';

const BORDER_COLORS = [
  'border-indigo-600',
  'border-rose-600',
  'border-emerald-600',
  'border-amber-600',
  'border-cyan-600',
  'border-purple-700',
  'border-teal-600',
  'border-orange-600',
];

export default function CreditCards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSignModal, setShowSignModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  const fetchData = () => {
    setLoading(true);
    accountingApi.getCreditCards().then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const handleDownloadPdf = ({ mdName, ceoName }) => {
    if (!data) return;
    const period = 'All Time';
    const cardRows = data.cards.map(c => `
      <tr>
        <td>${c.name}${c.bank_name ? ' (' + c.bank_name + ')' : ''}</td>
        <td>Tk ${Number(c.credit_limit).toLocaleString()}</td>
        <td>Tk ${Number(c.total_credit_used).toLocaleString()}</td>
        <td>Tk ${Number(c.total_paid).toLocaleString()}</td>
        <td>Tk ${Number(c.outstanding_balance).toLocaleString()}</td>
      </tr>`).join('');
    const tableHtml = `
      <table>
        <thead><tr><th>Card</th><th>Limit</th><th>Total Used</th><th>Total Paid</th><th>Outstanding</th></tr></thead>
        <tbody>${cardRows}</tbody>
        <tfoot>
          <tr>
            <td>Total</td><td>—</td>
            <td>Tk ${Number(data.totals.total_credit_used).toLocaleString()}</td>
            <td>Tk ${Number(data.totals.total_paid).toLocaleString()}</td>
            <td>Tk ${Number(data.totals.outstanding_balance).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>`;
    exportAccountingPdf({ title: 'Credit Cards Overview', period, tableHtml, mdName, ceoName });
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-dark">Credit Cards</h1>
        <button onClick={() => setShowSignModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium">
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
            {data.cards.map((card, idx) => (
              <div key={card.id} onClick={() => setSelectedCard(card)}
                className={`card cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99] border-l-[10px] ${BORDER_COLORS[idx % BORDER_COLORS.length]}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="font-semibold">{card.name}</p>
                    {card.bank_name && <p className="text-xs text-gray-400">{card.bank_name}</p>}
                  </div>
                  <span className="ml-auto text-xs text-gray-400">View History →</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Credit Limit</p>
                    <p className="font-bold text-gray-700">
                      {card.credit_limit > 0 ? `Tk ${Number(card.credit_limit).toLocaleString()}` : '—'}
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Outstanding</p>
                    <p className="font-bold text-orange-600">Tk {Number(card.outstanding_balance).toLocaleString()}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Total Used</p>
                    <p className="font-bold text-purple-600">Tk {Number(card.total_credit_used).toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Total Paid</p>
                    <p className="font-bold text-blue-600">Tk {Number(card.total_paid).toLocaleString()}</p>
                  </div>
                </div>

                {card.usd_outstanding > 0 && (
                  <div className="mt-3 bg-green-50 rounded-xl p-3 flex justify-between items-center">
                    <p className="text-xs text-gray-500">USD Outstanding</p>
                    <p className="font-bold text-green-700">${Number(card.usd_outstanding).toLocaleString()}</p>
                  </div>
                )}
                {card.interest_rate && (
                  <p className="text-xs text-gray-400 mt-3">Interest Rate: {card.interest_rate}%</p>
                )}
              </div>
            ))}
          </div>

          <div className="card bg-primary-50">
            <h3 className="font-semibold text-gray-700 mb-3">All Cards Total</h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Total Used</p>
                <p className="font-bold text-purple-600">Tk {Number(data.totals.total_credit_used).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Total Paid</p>
                <p className="font-bold text-blue-600">Tk {Number(data.totals.total_paid).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Total Outstanding</p>
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

      {selectedCard && createPortal(
        <CardLedgerModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />,
        document.body
      )}
    </div>
  );
}

function CardLedgerModal({ card, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountingApi.getLedger(card.id, {}).then(r => {
      setEntries(r.data?.entries || []);
      setLoading(false);
    }).catch(() => { toast.error('লেজার লোড হয়নি'); setLoading(false); });
  }, [card.id]);

  const typeLabel = (entry) => {
    const type = entry.transaction_type;
    if (type === 'credit_card_charge') return { label: 'Interest/Charge', color: 'text-purple-600 bg-purple-50' };
    if (type === 'credit_card_payment') return { label: 'Payment', color: 'text-blue-600 bg-blue-50' };
    if (type === 'expense') return { label: 'Expense', color: 'text-red-500 bg-red-50' };
    return { label: type || 'Other', color: 'text-gray-500 bg-gray-100' };
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-lg">{card.name}</h3>
            {card.bank_name && <p className="text-xs text-gray-400">{card.bank_name}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4 border-b border-gray-100">
          <div className="text-center">
            <p className="text-xs text-gray-500">Outstanding</p>
            <p className="font-bold text-orange-600">Tk {Number(card.outstanding_balance).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Total Used</p>
            <p className="font-bold text-purple-600">Tk {Number(card.total_credit_used).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Total Paid</p>
            <p className="font-bold text-blue-600">Tk {Number(card.total_paid).toLocaleString()}</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex justify-center py-8"><div className="spinner w-6 h-6" /></div>
          ) : entries.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No transactions found</p>
          ) : (
            <div className="space-y-2">
              {entries.map(entry => {
                const { label, color } = typeLabel(entry);
                const isCharge = entry.entry_type === 'credit';
                return (
                  <div key={entry.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[48px]">
                        <p className="text-xs font-medium text-gray-700">{format(new Date(entry.entry_date), 'dd MMM')}</p>
                        <p className="text-xs text-gray-400">{format(new Date(entry.entry_date), 'yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{entry.description || '—'}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${color}`}>{label}</span>
                      </div>
                    </div>
                    <p className={`font-semibold text-sm ${isCharge ? 'text-red-500' : 'text-green-600'}`}>
                      {isCharge ? '+' : '-'} Tk {Number(entry.amount).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
