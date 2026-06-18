import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { canEditModule } from '../../utils/moduleAccess';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Trash2, Camera, X, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Edit2, CreditCard, TrendingUp, Users } from 'lucide-react';

export default function Transactions() {
 const { user } = useAuth();
  const canEdit = canEditModule(user, 'accounting');
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entryMode, setEntryMode] = useState(null);
  const [editTxn, setEditTxn] = useState(null);
  const [filters, setFilters] = useState({ date_from: '', date_to: '', transaction_type: '' });

  const fetchTransactions = (f = filters) => {
    setLoading(true);
    const params = {};
    if (f.date_from) params.date_from = f.date_from;
    if (f.date_to) params.date_to = f.date_to;
    if (f.transaction_type) params.transaction_type = f.transaction_type;
    accountingApi.getTransactions(params).then(r => {
      setTransactions(r.data || []);
      setTotal(r.total || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchTransactions(); }, []);

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

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <button onClick={() => setEntryMode('in')}
          className="flex flex-col items-center gap-2 p-4 bg-green-50 text-green-600 rounded-2xl border-2 border-green-100 active:scale-95 transition-all">
          <ArrowDownCircle size={28} />
          <span className="font-semibold text-sm">Cash In</span>
        </button>
        <button onClick={() => setEntryMode('out')}
          className="flex flex-col items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl border-2 border-red-100 active:scale-95 transition-all">
          <ArrowUpCircle size={28} />
          <span className="font-semibold text-sm">Cash Out</span>
        </button>
        <button onClick={() => setEntryMode('transfer')}
          className="flex flex-col items-center gap-2 p-4 bg-blue-50 text-blue-600 rounded-2xl border-2 border-blue-100 active:scale-95 transition-all">
          <ArrowLeftRight size={28} />
          <span className="font-semibold text-sm">Transfer</span>
        </button>
        <button onClick={() => setEntryMode('card_charge')}
          className="flex flex-col items-center gap-2 p-4 bg-purple-50 text-purple-600 rounded-2xl border-2 border-purple-100 active:scale-95 transition-all">
          <CreditCard size={28} />
          <span className="font-semibold text-sm">Card Charge</span>
        </button>
        <button onClick={() => setEntryMode('investor_profit')}
          className="flex flex-col items-center gap-2 p-4 bg-amber-50 text-amber-600 rounded-2xl border-2 border-amber-100 active:scale-95 transition-all">
          <TrendingUp size={28} />
          <span className="font-semibold text-sm">Investor Profit</span>
        </button>
        <button onClick={() => setEntryMode('distribute_profit')}
          className="flex flex-col items-center gap-2 p-4 bg-teal-50 text-teal-600 rounded-2xl border-2 border-teal-100 active:scale-95 transition-all">
          <Users size={28} />
          <span className="font-semibold text-sm">Distribute Profit</span>
        </button>
      </div>

      <div className="card mb-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <input type="date" className="input-field" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} />
          <input type="date" className="input-field" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchTransactions()} className="btn-primary py-2 px-6">Search</button>
          <button onClick={() => { setFilters({ date_from: '', date_to: '', transaction_type: '' }); fetchTransactions({ date_from: '', date_to: '', transaction_type: '' }); }}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">Reset</button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Description', 'Account', 'Cash In', 'Cash Out', 'Created By', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No records</td></tr>
              ) : transactions.map(t => {
                const isCashIn = t.transaction_type === 'revenue';
                const isCashOut = t.transaction_type === 'expense';
                const isCardCharge = t.transaction_type === 'credit_card_charge';
                const isTransfer = !isCashIn && !isCashOut && !isCardCharge;
                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{format(new Date(t.transaction_date), 'dd/MM/yy')}</td>
                    <td className="px-4 py-3 text-gray-600">{t.description || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <p className="text-xs">{t.debit_account_name}</p>
                      <p className="text-xs text-gray-400">← {t.credit_account_name}</p>
                      {isTransfer && <span className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">Transfer</span>}
                      {t.transaction_type === 'credit_card_charge' && <span className="text-xs bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded">Card Charge</span>}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap text-green-600">
                      {isCashIn ? `Tk ${Number(t.amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap text-red-600">
                      {isCashOut ? `Tk ${Number(t.amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{t.created_by_name || t.created_by_phone || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {(isSuperAdmin || canEdit) && (
                          <button onClick={() => setEditTxn(t)}
                            className="px-2 py-1 bg-primary-50 text-primary-600 rounded-lg text-xs font-medium">
                            <Edit2 size={14} />
                          </button>
                        )}
                        {(isSuperAdmin || canEdit) && (
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
    </div>
  );
}

function EntryModal({ mode, onClose, onSuccess }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [proofPreview, setProofPreview] = useState(null);
  const [form, setForm] = useState({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    account_id: '',
    category_id: '',
    party: '',
    description: '',
    proof: null,
    proof_type: 'voucher',
    investor_id: '',
  });

  useEffect(() => {
    accountingApi.getAllAccounts().then(r => setAccounts(r.data || []));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const assetAccounts = accounts.filter(a => a.is_active && (a.account_type === 'asset'));
  const revenueAccounts = accounts.filter(a => a.is_active && a.account_type === 'revenue');
  const expenseAccounts = accounts.filter(a => a.is_active && a.account_type === 'expense');
  const liabilityAccounts = accounts.filter(a => a.is_active && a.account_type === 'liability');
  const creditCardAccounts = accounts.filter(a => a.is_active && a.account_subtype === 'credit_card');
  const investorAccounts = accounts.filter(a => a.is_active && a.account_subtype === 'investor_loan');
  const profitExpenseAccount = accounts.find(a => a.name === 'Investor Profit Expense');

  const inCategoryOptions = [...revenueAccounts, ...liabilityAccounts];
  const outCategoryOptions = [...expenseAccounts, ...liabilityAccounts];

  const titles = {
    in: 'Cash In',
    out: 'Cash Out',
    transfer: 'Transfer',
    card_charge: 'Credit Card Charge',
    investor_profit: 'Investor Profit Payment',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount');
    if (!form.account_id) return toast.error('Select an account');

    let debit_account_id, credit_account_id, transaction_type;

    if (mode === 'in') {
      if (!form.category_id) return toast.error('Select what this is for');
      debit_account_id = form.account_id;
      credit_account_id = form.category_id;
      transaction_type = 'revenue';
    } else if (mode === 'out') {
      if (!form.category_id) return toast.error('Select expense category');
      debit_account_id = form.category_id;
      credit_account_id = form.account_id;
      transaction_type = 'expense';
    } else if (mode === 'transfer') {
      if (!form.category_id) return toast.error('Select destination account');
      if (form.account_id === form.category_id) return toast.error('From and To accounts cannot be the same');
      debit_account_id = form.category_id;
      credit_account_id = form.account_id;
      transaction_type = 'fund_transfer';
    } else if (mode === 'card_charge') {
      if (!form.category_id) return toast.error('Select expense category');
      debit_account_id = form.category_id;
      credit_account_id = form.account_id;
      transaction_type = 'credit_card_charge';
    } else {
      if (!form.investor_id) return toast.error('Select investor');
      if (!profitExpenseAccount) return toast.error('Investor Profit Expense account not found');
      debit_account_id = profitExpenseAccount.id;
      credit_account_id = form.account_id;
      transaction_type = 'investor_profit_payment';
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('transaction_date', form.transaction_date);
      formData.append('transaction_type', transaction_type);
      formData.append('amount', form.amount);
      formData.append('debit_account_id', debit_account_id);
      formData.append('credit_account_id', credit_account_id);
      formData.append('description', form.party ? `${form.party}${form.description ? ' — ' + form.description : ''}` : form.description);
      formData.append('proof_type', form.proof_type);
      if (mode === 'investor_profit' && form.investor_id) formData.append('related_account_id', form.investor_id);
      if (form.proof) formData.append('proof', form.proof);

      await accountingApi.createTransaction(formData);
      toast.success('Entry saved ✅');
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
            <h3 className="font-bold text-lg">{titles[mode]}</h3>
            <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Date *</label>
              <input type="date" className="input-field" value={form.transaction_date}
                onChange={e => set('transaction_date', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Amount (Tk) *</label>
              <input type="number" className="input-field" value={form.amount}
                onChange={e => set('amount', e.target.value)} />
            </div>

            {mode === 'in' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Deposited to? *</label>
                  <select className="input-field" value={form.account_id}
                    onChange={e => set('account_id', e.target.value)}>
                    <option value="">-- Select --</option>
                    {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">For what? *</label>
                  <select className="input-field" value={form.category_id}
                    onChange={e => set('category_id', e.target.value)}>
                    <option value="">-- Select --</option>
                    {inCategoryOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">From whom? (optional)</label>
                  <input type="text" className="input-field" value={form.party}
                    onChange={e => set('party', e.target.value)} placeholder="e.g. student name, investor..." />
                </div>
              </>
            )}

            {mode === 'out' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Paid from? *</label>
                  <select className="input-field" value={form.account_id}
                    onChange={e => set('account_id', e.target.value)}>
                    <option value="">-- Select --</option>
                    {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Expense category? *</label>
                  <select className="input-field" value={form.category_id}
                    onChange={e => set('category_id', e.target.value)}>
                    <option value="">-- Select --</option>
                    {outCategoryOptions.map(a => <option key={a.id} value={a.id}>{a.name}{a.account_type === 'liability' ? ' (Payment)' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Paid to? (optional)</label>
                  <input type="text" className="input-field" value={form.party}
                    onChange={e => set('party', e.target.value)} placeholder="e.g. staff name, organization..." />
                </div>
              </>
            )}

            {mode === 'investor_profit' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Investor *</label>
                  <select className="input-field" value={form.investor_id}
                    onChange={e => set('investor_id', e.target.value)}>
                    <option value="">-- Select --</option>
                    {investorAccounts.map(a => <option key={a.id} value={a.id}>{a.investor_name || a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Paid From *</label>
                  <select className="input-field" value={form.account_id}
                    onChange={e => set('account_id', e.target.value)}>
                    <option value="">-- Select --</option>
                    {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </>
            )}

            {mode === 'card_charge' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Which Card? *</label>
                  <select className="input-field" value={form.account_id}
                    onChange={e => set('account_id', e.target.value)}>
                    <option value="">-- Select --</option>
                    {creditCardAccounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.bank_name ? ` (${a.bank_name})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Expense Category *</label>
                  <select className="input-field" value={form.category_id}
                    onChange={e => set('category_id', e.target.value)}>
                    <option value="">-- Select --</option>
                    {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </>
            )}

            {mode === 'transfer' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">From *</label>
                  <select className="input-field" value={form.account_id}
                    onChange={e => set('account_id', e.target.value)}>
                    <option value="">-- Select --</option>
                    {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">To *</label>
                  <select className="input-field" value={form.category_id}
                    onChange={e => set('category_id', e.target.value)}>
                    <option value="">-- Select --</option>
                    {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea className="input-field resize-none" rows={2} value={form.description}
                onChange={e => set('description', e.target.value)} placeholder="Additional info (optional)" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Proof / Voucher / Cheque image</label>
              {proofPreview ? (
                <div className="relative">
                  <img src={proofPreview} className="w-full h-32 object-cover rounded-xl" alt="proof" />
                  <button type="button" onClick={() => { setProofPreview(null); set('proof', null); }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer">
                  <Camera size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-400">Upload image (optional)</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files[0];
                    if (file) { set('proof', file); setProofPreview(URL.createObjectURL(file)); }
                  }} />
                </label>
              )}
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : '✅ Save Entry'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function DistributeProfitModal({ onClose, onSuccess }) {
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
            <h3 className="font-bold text-lg">Distribute Profit to Shareholders</h3>
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
              {loading ? 'Saving...' : '✅ Distribute Profit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditModal({ txn, onClose, onSuccess }) {
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
                <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer">
                  <Camera size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-400">Upload new image</span>
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