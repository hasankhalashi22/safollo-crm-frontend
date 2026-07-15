import { useState, useEffect, useRef } from 'react';
import EntryModal, { useScrollLock } from '../../components/accounting/EntryModal';
import { accountingApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { canEditModule, canUpdateModule } from '../../utils/moduleAccess';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Trash2, Camera, X, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Edit2, CreditCard, TrendingUp, Users, ZoomIn, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const PAGE_SIZE = 30;

export default function Transactions() {
 const { user } = useAuth();
  const canEdit = canEditModule(user, 'accounting');
  const canUpdate = canUpdateModule(user, 'accounting');
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entryMode, setEntryMode] = useState(null);
  const [editTxn, setEditTxn] = useState(null);
  const [proofModal, setProofModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ date_from: '', date_to: '', transaction_type: '', account_id: '', student_phone: '' });

  const fetchTransactions = (f = filters) => {
    setLoading(true);
    const params = {};
    if (f.date_from) params.date_from = f.date_from;
    if (f.date_to) params.date_to = f.date_to;
    if (f.transaction_type) params.transaction_type = f.transaction_type;
    if (f.account_id) params.account_id = f.account_id;
    if (f.student_phone) params.student_phone = f.student_phone;
    accountingApi.getTransactions(params).then(r => {
      setTransactions(r.data || []);
      setTotal(r.total || 0);
      setCurrentPage(1);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransactions();
    accountingApi.getAccounts().then(r => setAccounts(r.data || []));
  }, []);

  const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  const handleDelete = async (txn) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await accountingApi.deleteTransaction(txn.id);
      toast.success('Entry deleted ✅');
      fetchTransactions();
    } catch (err) { toast.error(err.message || 'Something went wrong'); }
  };

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark">Transactions</h1>
          <p className="text-gray-500 text-sm">Total {total} entries</p>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
        <div className="relative group">
          <button onClick={() => setEntryMode('in')}
            className="w-full flex flex-col items-center gap-2 p-4 bg-green-50 text-green-600 rounded-2xl border-2 border-green-100 active:scale-95 transition-all">
            <ArrowDownCircle size={28} />
            <span className="font-semibold text-sm">Cash In</span>
          </button>
          <div className="absolute top-full left-0 mt-2 w-72 bg-gray-800 text-white text-xs rounded-xl p-3 hidden group-hover:block z-50 leading-relaxed">
            ব্যবসায় নগদ অর্থ প্রবেশ করলে।<br />• বিনিয়োগ গ্রহণ<br />• ব্যাংক ঋণ গ্রহণ<br />• অন্য উৎস থেকে আয়
          </div>
        </div>
        <div className="relative group">
          <button onClick={() => setEntryMode('out')}
            className="w-full flex flex-col items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl border-2 border-red-100 active:scale-95 transition-all">
            <ArrowUpCircle size={28} />
            <span className="font-semibold text-sm">Cash Out</span>
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-gray-800 text-white text-xs rounded-xl p-3 hidden group-hover:block z-50 leading-relaxed">
            ব্যবসা থেকে অর্থ বের হলে বা দেনা পরিশোধ করলে।<br />• অফিস খরচ, সরবরাহকারীকে পেমেন্ট<br />• ক্রেডিট কার্ডের মাসিক বিল পরিশোধ<br />• ক্রেডিট কার্ড দিয়ে কেনাকাটা (৳ বা $)<br />• বিনিয়োগকারীর মূল বিনিয়োগ ফেরত
          </div>
        </div>
        <div className="relative group">
          <button onClick={() => setEntryMode('transfer')}
            className="w-full flex flex-col items-center gap-2 p-4 bg-blue-50 text-blue-600 rounded-2xl border-2 border-blue-100 active:scale-95 transition-all">
            <ArrowLeftRight size={28} />
            <span className="font-semibold text-sm">Transfer</span>
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-gray-800 text-white text-xs rounded-xl p-3 hidden group-hover:block z-50 leading-relaxed">
            এক একাউন্ট থেকে অন্য একাউন্টে টাকা সরানো। আয় বা ব্যয় নয়, শুধু স্থানান্তর।<br />• ব্যাংক থেকে Personal A/C (CEO)-তে<br />• bKash থেকে ব্যাংকে<br />• Petty Cash থেকে Nagad-এ
          </div>
        </div>
        <div className="relative group">
          <button onClick={() => setEntryMode('card_charge')}
            className="w-full flex flex-col items-center gap-2 p-4 bg-purple-50 text-purple-600 rounded-2xl border-2 border-purple-100 active:scale-95 transition-all">
            <CreditCard size={28} />
            <span className="font-semibold text-sm">Card Interest</span>
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-gray-800 text-white text-xs rounded-xl p-3 hidden group-hover:block z-50 leading-relaxed">
            ক্রেডিট কার্ডের সুদ বা চার্জ রেকর্ড করতে। নগদ বের হয় না, কার্ডের দেনা বাড়ে।<br />• মাসিক কার্ড সুদ<br />• লেট কার্ড পেমেন্ট ফি<br />• USD সুদও এখান থেকে যোগ করা যায়
          </div>
        </div>
        <div className="relative group">
          <button onClick={() => setEntryMode('distribute_profit')}
            className="w-full flex flex-col items-center gap-2 p-4 bg-teal-50 text-teal-600 rounded-2xl border-2 border-teal-100 active:scale-95 transition-all">
            <Users size={28} />
            <span className="font-semibold text-sm">Shareholder Profit</span>
          </button>
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-gray-800 text-white text-xs rounded-xl p-3 hidden group-hover:block z-50 leading-relaxed">
            অর্জিত মুনাফা বিনিয়োগকারীদের মধ্যে প্রকৃত টাকা বিতরণ করলে।<br />• শেয়ার অনুযায়ী স্বয়ংক্রিয় ভাগ হয়<br />• Investor Profit-এ accrual করার পর এখান থেকে পরিশোধ
          </div>
        </div>
      </div>

      <div className="card mb-4 space-y-3">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <input type="date" className="input-field" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} />
          <input type="date" className="input-field" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <select className="input-field" value={filters.transaction_type} onChange={e => setFilter('transaction_type', e.target.value)}>
            <option value="">সব Type</option>
            <option value="revenue">Cash In</option>
            <option value="expense">Cash Out</option>
            <option value="fund_transfer">Transfer</option>
            <option value="credit_card_charge">Card Interest</option>
            <option value="credit_card_payment">Card Payment</option>
            <option value="investor_profit_payment">Investor Profit</option>
          </select>
          <select className="input-field" value={filters.account_id} onChange={e => setFilter('account_id', e.target.value)}>
            <option value="">সব Account</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <input type="text" className="input-field" placeholder="মোবাইল নম্বর দিয়ে খুঁজুন (student)" value={filters.student_phone} onChange={e => setFilter('student_phone', e.target.value)} />
        <div className="flex gap-2">
          <button onClick={() => fetchTransactions()} className="btn-primary py-2 px-6">Search</button>
          <button onClick={() => { const empty = { date_from: '', date_to: '', transaction_type: '', account_id: '', student_phone: '' }; setFilters(empty); fetchTransactions(empty); }}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">Reset</button>
        </div>
      </div>

      {transactions.length > 0 && (() => {
        const totalIn = transactions.filter(t => t.transaction_type === 'revenue').reduce((s, t) => s + Number(t.amount), 0);
        const totalOut = transactions.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        return (
          <div className="flex flex-wrap gap-4 mb-3 px-1">
            <div className="text-sm text-gray-500">মোট এন্ট্রি: <span className="font-bold text-gray-700">{transactions.length}</span></div>
            <div className="text-sm text-green-600">মোট Cash In: <span className="font-bold">Tk {totalIn.toLocaleString()}</span></div>
            <div className="text-sm text-red-600">মোট Cash Out: <span className="font-bold">Tk {totalOut.toLocaleString()}</span></div>
          </div>
        );
      })()}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['#', 'Date', 'Description', 'Account', 'Cash In', 'Cash Out / Transfer', 'Created By', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No records</td></tr>
              ) : transactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((t, idx) => {
                const isCashIn = t.transaction_type === 'revenue';
                const isCashOut = t.transaction_type === 'expense';
                const isCardCharge = t.transaction_type === 'credit_card_charge';
                const isTransfer = !isCashIn && !isCashOut && !isCardCharge;
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{format(new Date(t.transaction_date), 'dd/MM/yy')}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{t.description || '—'}</div>
                      {t.source === 'crm_sync' && <span className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded mt-0.5 inline-block">CRM</span>}
                      {t.student_name && <div className="text-xs text-gray-400 mt-0.5">{t.student_name} · {t.student_phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <p className="text-xs">{t.debit_account_name}</p>
                      <p className="text-xs text-gray-400">← {t.credit_account_name}</p>
                      {isTransfer && <span className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">Transfer</span>}
                      {t.transaction_type === 'credit_card_charge' && <span className="text-xs bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded">Card Interest</span>}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap text-green-600">
                      {isCashIn ? `Tk ${Number(t.amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap text-red-600">
                      {isCashOut ? `Tk ${Number(t.amount).toLocaleString()}` : isTransfer ? <span className="text-blue-600">Tk {Number(t.amount).toLocaleString()}</span> : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{t.created_by_name || t.created_by_phone || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {t.proof_url && (
                          <button onClick={() => setProofModal(t.proof_url)}
                            className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-medium" title="Proof দেখুন">
                            <ZoomIn size={14} />
                          </button>
                        )}
                        {(isSuperAdmin || canUpdate) && (
                          <button onClick={() => setEditTxn(t)}
                            className="px-2 py-1 bg-primary-50 text-primary-600 rounded-lg text-xs font-medium">
                            <Edit2 size={14} />
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button onClick={() => handleDelete(t)}
                            className="px-2 py-1 bg-red-50 text-red-500 rounded-lg text-xs font-medium">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {transactions.length > 1 && (() => {
        const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
        const pages = [];
        const start = Math.max(1, currentPage - 3);
        const end = Math.min(totalPages, start + 6);
        for (let i = start; i <= end; i++) pages.push(i);
        return totalPages > 1 ? (
          <div className="flex items-center justify-center gap-1 mt-4">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronsLeft size={16} /></button>
            <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={16} /></button>
            {pages.map(p => (
              <button key={p} onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === p ? 'bg-primary-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={16} /></button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronsRight size={16} /></button>
          </div>
        ) : null;
      })()}

      {entryMode && entryMode !== 'distribute_profit' && (
        <EntryModal
          mode={entryMode}
          onClose={() => setEntryMode(null)}
          onSuccess={() => { setEntryMode(null); fetchTransactions(); }}
        />
      )}


      {entryMode === 'distribute_profit' && (
        <DistributeProfitModal
          onClose={() => setEntryMode(null)}
          onSuccess={() => { setEntryMode(null); fetchTransactions(); }}
        />
      )}

      {editTxn && (
        <EditModal
          txn={editTxn}
          onClose={() => setEditTxn(null)}
          onSuccess={() => { setEditTxn(null); fetchTransactions(); }}
        />
      )}

      {proofModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setProofModal(null)}>
          <button className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2" onClick={() => setProofModal(null)}>
            <X size={20} />
          </button>
          <img
            src={proofModal}
            alt="proof"
            className="max-w-full max-h-[90vh] rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function DistributeProfitModal({ onClose, onSuccess }) {
  useScrollLock();
  const [accounts, setAccounts] = useState([]);
  const [shareholders, setShareholders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    total_amount: '',
    paid_from_account_id: '',
    description: '',
  });

  useEffect(() => {
    accountingApi.getAllAccounts().then(r => {
      const all = r.data || [];
      setAccounts(all.filter(a => a.is_active && a.account_type === 'asset'));
      setShareholders(all.filter(a => a.is_active && a.account_subtype === 'shareholder'));
    });
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const totalPercentage = shareholders.reduce((sum, s) => sum + parseFloat(s.share_percentage || 0), 0);

  const breakdown = shareholders.map(s => ({
    name: s.shareholder_name || s.name,
    percentage: s.share_percentage,
    amount: form.total_amount ? Math.round((parseFloat(form.total_amount) * parseFloat(s.share_percentage) / 100) * 100) / 100 : 0,
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.total_amount || Number(form.total_amount) <= 0) return toast.error('সঠিক পরিমাণ দিন');
    if (!form.paid_from_account_id) return toast.error('কোথা থেকে দিচ্ছেন বেছে নিন');
    if (Math.abs(totalPercentage - 100) > 0.01) return toast.error(`শেয়ারহোল্ডারদের মোট শেয়ার ১০০% নয় (বর্তমানে ${totalPercentage}%)`);

    setLoading(true);
    try {
      await accountingApi.distributeProfit(form);
      toast.success('Profit distributed ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-end lg:items-center justify-center p-4">
        <div className="bg-white w-full lg:max-w-lg rounded-t-3xl lg:rounded-2xl">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-lg">Shareholder Profit to Shareholders</h3>
            <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Date *</label>
              <input type="date" className="input-field" value={form.transaction_date}
                onChange={e => set('transaction_date', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Total Amount (Tk) *</label>
              <input type="number" className="input-field" value={form.total_amount}
                onChange={e => set('total_amount', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Paid From *</label>
              <select className="input-field" value={form.paid_from_account_id}
                onChange={e => set('paid_from_account_id', e.target.value)}>
                <option value="">-- Select --</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea className="input-field resize-none" rows={2} value={form.description}
                onChange={e => set('description', e.target.value)} placeholder="Optional" />
            </div>

            {shareholders.length === 0 ? (
              <p className="text-sm text-red-500 bg-red-50 p-3 rounded-xl">No shareholder accounts found. Create them in Chart of Accounts first.</p>
            ) : (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm font-medium mb-2">Breakdown (Total Share: {totalPercentage}%)</p>
                {breakdown.map((b, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1">
                    <span className="text-gray-600">{b.name} ({b.percentage}%)</span>
                    <span className="font-medium">Tk {Number(b.amount).toLocaleString()}</span>
                  </div>
                ))}
                {Math.abs(totalPercentage - 100) > 0.01 && (
                  <p className="text-xs text-red-500 mt-2">⚠️ Total percentage is not 100%</p>
                )}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading || shareholders.length === 0}>
              {loading ? 'Saving...' : '✅ Shareholder Profit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditModal({ txn, onClose, onSuccess }) {
  useScrollLock();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [proofPreview, setProofPreview] = useState(null);
  const [form, setForm] = useState({
    transaction_date: txn.transaction_date?.split('T')[0] || '',
    transaction_type: txn.transaction_type,
    amount: txn.amount,
    debit_account_id: txn.debit_account_id,
    credit_account_id: txn.credit_account_id,
    description: txn.description || '',
    reference_no: txn.reference_no || '',
    proof: null,
  });

  useEffect(() => {
    accountingApi.getAllAccounts().then(r => setAccounts(r.data || []));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount');
    if (!form.debit_account_id || !form.credit_account_id) return toast.error('Select accounts');
    if (form.debit_account_id === form.credit_account_id) return toast.error('Debit and Credit accounts cannot be the same');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('transaction_date', form.transaction_date);
      formData.append('transaction_type', form.transaction_type);
      formData.append('amount', form.amount);
      formData.append('debit_account_id', form.debit_account_id);
      formData.append('credit_account_id', form.credit_account_id);
      formData.append('description', form.description);
      formData.append('reference_no', form.reference_no);
      if (form.proof) formData.append('proof', form.proof);

      await accountingApi.updateTransaction(txn.id, formData);
      toast.success('Entry updated ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-end lg:items-center justify-center p-4">
        <div className="bg-white w-full lg:max-w-lg rounded-t-3xl lg:rounded-2xl">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-lg">Edit Entry</h3>
            <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Date *</label>
              <input type="date" className="input-field" value={form.transaction_date}
                onChange={e => set('transaction_date', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Type *</label>
              <select className="input-field" value={form.transaction_type}
                onChange={e => set('transaction_type', e.target.value)}>
                <option value="revenue">Revenue</option>
                <option value="expense">Expense</option>
                <option value="fund_transfer">Transfer</option>
                <option value="bank_withdrawal">Bank Withdrawal</option>
                <option value="credit_card_payment">Credit Card Payment</option>
                <option value="investor_payment">Investor Payment</option>
                <option value="salary_payment">Salary Payment</option>
                <option value="teacher_payment">Teacher Payment</option>
                <option value="steadfast_withdrawal">Steadfast Withdrawal</option>
                <option value="adjusting_entry">Adjusting Entry</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Amount (Tk) *</label>
              <input type="number" className="input-field" value={form.amount}
                onChange={e => set('amount', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Debit Account *</label>
              <select className="input-field" value={form.debit_account_id}
                onChange={e => set('debit_account_id', e.target.value)}>
                {accounts.filter(a => a.is_active).map(a => (
                  <option key={a.id} value={a.id}>[{a.account_type}] {a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Credit Account *</label>
              <select className="input-field" value={form.credit_account_id}
                onChange={e => set('credit_account_id', e.target.value)}>
                {accounts.filter(a => a.is_active).map(a => (
                  <option key={a.id} value={a.id}>[{a.account_type}] {a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea className="input-field resize-none" rows={2} value={form.description}
                onChange={e => set('description', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Reference Number</label>
              <input type="text" className="input-field" value={form.reference_no}
                onChange={e => set('reference_no', e.target.value)} />
            </div>

            {txn.proof_url && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Current Proof</label>
                <a href={txn.proof_url} target="_blank" rel="noreferrer" className="text-primary-500 underline text-sm">View Proof</a>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">Upload New Proof (optional)</label>
              {proofPreview ? (
                <div className="relative">
                  <img src={proofPreview} className="w-full h-32 object-cover rounded-xl" alt="proof" />
                  <button type="button" onClick={() => { setProofPreview(null); set('proof', null); }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer"
                  onPaste={e => {
                    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
                    if (item) { const file = item.getAsFile(); set('proof', file); setProofPreview(URL.createObjectURL(file)); }
                  }}>
                  <Camera size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-400">Upload new image or Ctrl+V to paste</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files[0];
                    if (file) { set('proof', file); setProofPreview(URL.createObjectURL(file)); }
                  }} />
                </label>
              )}
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Updating...' : '✅ Update'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}