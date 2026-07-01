import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { Link } from 'react-router-dom';
import { format, startOfMonth } from 'date-fns';
import { CreditCard, Download, Upload, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { exportAccountingPdf } from '../../utils/accountingPdf';
import SignatoryModal from '../../components/SignatoryModal';

export default function CreditCards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
const [showSignModal, setShowSignModal] = useState(false);
  const [statementModal, setStatementModal] = useState(null);

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

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button onClick={() => setStatementModal(card)}
                    className="flex items-center justify-center gap-1.5 py-2 bg-amber-50 text-amber-600 rounded-xl text-sm font-medium">
                    <Upload size={14} /> Upload Statement
                  </button>
                  <Link to="/accounting/ledger" className="text-center py-2 bg-primary-50 text-primary-600 rounded-xl text-sm font-medium">
                    View Ledger
                  </Link>
                </div>
              </div>
            ))}
          </div>

         {/* Totals */}
          <div className="card bg-primary-50">
            <h3 className="font-semibold text-gray-700 mb-3">All Cards Total</h3>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
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

      {statementModal && createPortal(
        <StatementUploadModal
          card={statementModal}
          onClose={() => setStatementModal(null)}
          onSuccess={() => { setStatementModal(null); fetchData(); }}
        />,
        document.body
      )}
    </div>
  );
}

function StatementUploadModal({ card, onClose, onSuccess }) {
  const [step, setStep] = useState('upload'); // upload, review
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    statement_date: '',
    total_interest_charged: '',
    total_statement_amount: '',
    academy_used_amount: card.total_credit_used - card.total_paid,
    academy_interest_share: '',
  });
  const [rawAiResponse, setRawAiResponse] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleAnalyze = async () => {
    if (!file) return toast.error('Select a statement file first');
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('statement', file);
      formData.append('account_id', card.id);
      const res = await accountingApi.analyzeStatement(formData);
      const extracted = res.data.extracted;
      setRawAiResponse(extracted);

      const totalInterest = extracted.total_interest_charged || 0;
      const totalAmount = extracted.total_statement_amount || extracted.previous_outstanding || 0;
      const academyUsed = card.total_credit_used - card.total_paid;
      const suggestedShare = totalAmount > 0 ? (totalInterest * (academyUsed / totalAmount)) : 0;

      setForm({
        statement_date: extracted.statement_date || '',
        total_interest_charged: totalInterest,
        total_statement_amount: totalAmount,
        academy_used_amount: Math.round(academyUsed * 100) / 100,
        academy_interest_share: Math.round(suggestedShare * 100) / 100,
      });
      setStep('review');
    } catch (err) {
      toast.error(err.message || 'Failed to read statement');
    } finally { setAnalyzing(false); }
  };

  const handleConfirm = async () => {
    if (!form.academy_interest_share || Number(form.academy_interest_share) <= 0) {
      return toast.error('Enter a valid interest amount');
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('account_id', card.id);
      formData.append('statement_date', form.statement_date);
      formData.append('total_interest_charged', form.total_interest_charged);
      formData.append('total_statement_amount', form.total_statement_amount);
      formData.append('academy_used_amount', form.academy_used_amount);
      formData.append('academy_interest_share', form.academy_interest_share);
      formData.append('raw_ai_response', JSON.stringify(rawAiResponse || {}));
      if (file) formData.append('statement', file);

      await accountingApi.confirmStatement(formData);
      toast.success('Interest entry created ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">{card.name} — Upload Statement</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full"><X size={16} /></button>
        </div>

        {step === 'upload' && (
          <div className="space-y-4">
            <label className="flex flex-col items-center gap-2 p-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer">
              <Upload size={28} className="text-gray-400" />
              <span className="text-sm text-gray-500">{file ? file.name : 'Select statement (JPG, PNG, or PDF)'}</span>
              <input type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => setFile(e.target.files[0])} />
            </label>
            <button onClick={handleAnalyze} className="btn-primary" disabled={analyzing || !file}>
              {analyzing ? 'Reading statement...' : '🔍 Analyze Statement'}
            </button>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-3">
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">Review the extracted data below and correct anything that's wrong before confirming.</p>

            <div>
              <label className="block text-sm font-medium mb-1.5">Statement Date</label>
              <input type="date" className="input-field" value={form.statement_date}
                onChange={e => set('statement_date', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Total Statement Interest</label>
                <input type="number" className="input-field" value={form.total_interest_charged}
                  onChange={e => set('total_interest_charged', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Total Statement Amount</label>
                <input type="number" className="input-field" value={form.total_statement_amount}
                  onChange={e => set('total_statement_amount', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Academy's Used Amount</label>
              <input type="number" className="input-field" value={form.academy_used_amount}
                onChange={e => set('academy_used_amount', e.target.value)} />
            </div>

            <div className="bg-primary-50 p-3 rounded-xl">
              <label className="block text-sm font-medium mb-1.5">Academy's Interest Share (will be recorded)</label>
              <input type="number" className="input-field font-bold" value={form.academy_interest_share}
                onChange={e => set('academy_interest_share', e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Auto-calculated: Total Interest × (Academy Used / Total Statement)</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep('upload')} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">Back</button>
              <button onClick={handleConfirm} className="btn-primary flex-1" disabled={submitting}>
                {submitting ? 'Saving...' : '✅ Confirm & Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}