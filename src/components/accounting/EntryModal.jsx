import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Camera, X } from 'lucide-react';

function useScrollLock() {
  useEffect(() => {
    const y = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${y}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, y);
    };
  }, []);
}

const titles = {
  in: 'Cash In',
  out: 'Cash Out',
  transfer: 'Transfer',
  card_charge: 'Credit Card Interest',
  investor_profit: 'Investor Profit Payment',
};

export default function EntryModal({ mode, onClose, onSuccess, initialAmount = '', initialDescription = '', initialParty = '', initialCategoryId = '' }) {
  useScrollLock();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [proofPreview, setProofPreview] = useState(null);
  const [usdMode, setUsdMode] = useState(false);
  const [usdAmount, setUsdAmount] = useState('');
  const [form, setForm] = useState({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    amount: initialAmount ? String(initialAmount) : '',
    account_id: '',
    category_id: initialCategoryId ? String(initialCategoryId) : '',
    party: initialParty,
    description: initialDescription,
    proof: null,
    proof_type: 'voucher',
    investor_id: '',
  });

  useEffect(() => {
    accountingApi.getAllAccounts().then(r => setAccounts(r.data || []));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const assetAccounts = accounts.filter(a => a.is_active && a.account_type === 'asset');
  const revenueAccounts = accounts.filter(a => a.is_active && a.account_type === 'revenue');
  const expenseAccounts = accounts.filter(a => a.is_active && a.account_type === 'expense');
  const liabilityAccounts = accounts.filter(a => a.is_active && a.account_type === 'liability');
  const creditCardAccounts = accounts.filter(a => a.is_active && a.account_subtype === 'credit_card');
  const investorAccounts = accounts.filter(a => a.is_active && a.account_subtype === 'investor_loan');
  const profitExpenseAccount = accounts.find(a => a.name === 'Investor Profit Expense');

  const inCategoryOptions = [...revenueAccounts, ...liabilityAccounts];
  const outCategoryOptions = [...expenseAccounts, ...liabilityAccounts];

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
      const paidFromIsCard = creditCardAccounts.some(a => a.id === form.account_id);
      const categoryIsCard = creditCardAccounts.some(a => a.id === form.category_id);
      const categoryIsInvestor = investorAccounts.some(a => a.id === form.category_id);
      if (categoryIsInvestor) transaction_type = 'investor_profit_payment';
      else if (categoryIsCard) transaction_type = 'credit_card_payment';
      else if (paidFromIsCard) transaction_type = 'credit_card_charge';
      else transaction_type = 'expense';
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
      if (transaction_type === 'investor_profit_payment' && form.category_id) formData.append('related_account_id', form.category_id);
      if (form.proof) formData.append('proof', form.proof);
      if (usdMode && usdAmount) formData.append('usd_amount', usdAmount);

      const res = await accountingApi.createTransaction(formData);
      toast.success('Entry saved ✅');
      onSuccess(res?.data);
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

            {!usdMode && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Amount (Tk) *</label>
                <input type="number" className="input-field" value={form.amount}
                  onChange={e => set('amount', e.target.value)} />
              </div>
            )}

            {mode === 'in' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Deposited to? *</label>
                  <select className="input-field" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
                    <option value="">-- Select --</option>
                    {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">For what? *</label>
                  <select className="input-field" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
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
                    onChange={e => { set('account_id', e.target.value); set('category_id', ''); setUsdMode(false); setUsdAmount(''); }}>
                    <option value="">-- Select --</option>
                    {assetAccounts.length > 0 && <optgroup label="Cash / Bank / Wallet">
                      {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </optgroup>}
                    {creditCardAccounts.length > 0 && <optgroup label="Credit Card">
                      {creditCardAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </optgroup>}
                  </select>
                </div>
                {(() => {
                  const paidFromCard = creditCardAccounts.find(a => a.id === form.account_id);
                  if (!paidFromCard) return null;
                  return (
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" id="usd-purchase" checked={usdMode}
                        onChange={e => { setUsdMode(e.target.checked); setUsdAmount(''); }} />
                      <label htmlFor="usd-purchase" className="cursor-pointer">USD-তে কিনছেন?</label>
                    </div>
                  );
                })()}
                {usdMode && creditCardAccounts.some(a => a.id === form.account_id) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">USD Amount ($)</label>
                      <input type="number" className="input-field" value={usdAmount} onChange={e => setUsdAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">BDT Equivalent (৳)</label>
                      <input type="number" className="input-field" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Expense category? *</label>
                  <select className="input-field" value={form.category_id}
                    onChange={e => { set('category_id', e.target.value); setUsdMode(false); setUsdAmount(''); }}>
                    <option value="">-- Select --</option>
                    {outCategoryOptions.map(a => <option key={a.id} value={a.id}>{a.name}{a.account_type === 'liability' ? ' (Payment)' : ''}</option>)}
                  </select>
                </div>
                {(() => {
                  const categoryCard = creditCardAccounts.find(a => a.id === form.category_id);
                  if (!categoryCard || categoryCard.usd_outstanding <= 0) return null;
                  return (
                    <div className="bg-blue-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-medium text-blue-700">এই কার্ডে USD outstanding আছে</p>
                      <div className="flex gap-4 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" checked={!usdMode} onChange={() => { setUsdMode(false); setUsdAmount(''); }} /><span>BDT (৳)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" checked={usdMode} onChange={() => setUsdMode(true)} /><span>USD ($)</span>
                        </label>
                      </div>
                      {usdMode && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">USD পরিশোধ ($)</label>
                            <input type="number" className="input-field" value={usdAmount} onChange={e => setUsdAmount(e.target.value)} placeholder="0.00" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">BDT সমতুল্য (৳)</label>
                            <input type="number" className="input-field" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                  <select className="input-field" value={form.investor_id} onChange={e => set('investor_id', e.target.value)}>
                    <option value="">-- Select --</option>
                    {investorAccounts.map(a => <option key={a.id} value={a.id}>{a.investor_name || a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Paid From *</label>
                  <select className="input-field" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
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
                    onChange={e => { set('account_id', e.target.value); setUsdMode(false); setUsdAmount(''); }}>
                    <option value="">-- Select --</option>
                    {creditCardAccounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.bank_name ? ` (${a.bank_name})` : ''}</option>)}
                  </select>
                </div>
                {form.account_id && (() => {
                  const card = creditCardAccounts.find(a => a.id === form.account_id);
                  return card?.usd_outstanding > 0 ? (
                    <div className="flex gap-4 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={!usdMode} onChange={() => { setUsdMode(false); setUsdAmount(''); }} /><span>BDT Interest (৳)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={usdMode} onChange={() => setUsdMode(true)} /><span>USD Interest ($)</span>
                      </label>
                    </div>
                  ) : null;
                })()}
                {usdMode && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">USD Amount ($) *</label>
                      <input type="number" className="input-field" value={usdAmount} onChange={e => setUsdAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">BDT Equivalent (৳) *</label>
                      <input type="number" className="input-field" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Expense Category *</label>
                  <select className="input-field" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
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
                  <select className="input-field" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
                    <option value="">-- Select --</option>
                    {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">To *</label>
                  <select className="input-field" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
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
                <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer"
                  onPaste={e => {
                    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
                    if (item) { const file = item.getAsFile(); set('proof', file); setProofPreview(URL.createObjectURL(file)); }
                  }}>
                  <Camera size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-400">Upload image or Ctrl+V to paste (optional)</span>
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
