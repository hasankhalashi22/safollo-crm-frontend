import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Plus, Trash2, Camera, X, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from 'lucide-react';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entryMode, setEntryMode] = useState(null); // 'in', 'out', 'transfer'
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
    if (!confirm('এই এন্ট্রি delete করবেন?')) return;
    try {
      await accountingApi.deleteTransaction(txn.id);
      toast.success('এন্ট্রি delete হয়েছে ✅');
      fetchTransactions();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark">ট্রানজেকশন</h1>
          <p className="text-gray-500 text-sm">মোট {total}টি এন্ট্রি</p>
        </div>
      </div>

      {/* Big action buttons */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button onClick={() => setEntryMode('in')}
          className="flex flex-col items-center gap-2 p-4 bg-green-50 text-green-600 rounded-2xl border-2 border-green-100 active:scale-95 transition-all">
          <ArrowDownCircle size={28} />
          <span className="font-semibold text-sm">টাকা এসেছে</span>
        </button>
        <button onClick={() => setEntryMode('out')}
          className="flex flex-col items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl border-2 border-red-100 active:scale-95 transition-all">
          <ArrowUpCircle size={28} />
          <span className="font-semibold text-sm">টাকা গেছে</span>
        </button>
        <button onClick={() => setEntryMode('transfer')}
          className="flex flex-col items-center gap-2 p-4 bg-blue-50 text-blue-600 rounded-2xl border-2 border-blue-100 active:scale-95 transition-all">
          <ArrowLeftRight size={28} />
          <span className="font-semibold text-sm">ট্রান্সফার</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <input type="date" className="input-field" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} placeholder="শুরুর তারিখ" />
          <input type="date" className="input-field" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} placeholder="শেষ তারিখ" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchTransactions()} className="btn-primary py-2 px-6">খুঁজুন</button>
          <button onClick={() => { setFilters({ date_from: '', date_to: '', transaction_type: '' }); fetchTransactions({ date_from: '', date_to: '', transaction_type: '' }); }}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">রিসেট</button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['তারিখ', 'বিবরণ', 'একাউন্ট', 'পরিমাণ', 'তৈরি করেছেন', 'অ্যাকশন'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">লোড হচ্ছে...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">কোনো রেকর্ড নেই</td></tr>
              ) : transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{format(new Date(t.transaction_date), 'dd/MM/yy')}</td>
                  <td className="px-4 py-3 text-gray-600">{t.description || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    <p className="text-xs">{t.debit_account_name}</p>
                    <p className="text-xs text-gray-400">← {t.credit_account_name}</p>
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">৳{Number(t.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">{t.created_by_name || t.created_by_phone || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(t)}
                      className="px-2 py-1 bg-red-50 text-red-500 rounded-lg text-xs font-medium">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {entryMode && (
        <EntryModal
          mode={entryMode}
          onClose={() => setEntryMode(null)}
          onSuccess={() => { setEntryMode(null); fetchTransactions(); }}
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
    account_id: '',      // bank/cash/wallet account
    category_id: '',     // revenue/expense category
    party: '',
    description: '',
    proof: null,
    proof_type: 'voucher',
  });

  useEffect(() => {
    accountingApi.getAllAccounts().then(r => setAccounts(r.data || []));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const assetAccounts = accounts.filter(a => a.is_active && (a.account_type === 'asset'));
  const revenueAccounts = accounts.filter(a => a.is_active && a.account_type === 'revenue');
  const expenseAccounts = accounts.filter(a => a.is_active && a.account_type === 'expense');
  const liabilityAccounts = accounts.filter(a => a.is_active && a.account_type === 'liability');

  // For "Cash In", category can be revenue or liability (e.g. investor deposit, loan)
  const inCategoryOptions = [...revenueAccounts, ...liabilityAccounts];
  // For "Cash Out", category can be expense or liability (e.g. credit card payment, investor payout, loan repayment)
  const outCategoryOptions = [...expenseAccounts, ...liabilityAccounts];

  const titles = {
    in: 'টাকা এসেছে (Cash In)',
    out: 'টাকা গেছে (Cash Out)',
    transfer: 'ট্রান্সফার',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return toast.error('সঠিক পরিমাণ দিন');
    if (!form.account_id) return toast.error('একাউন্ট বেছে নিন');

    let debit_account_id, credit_account_id, transaction_type;

    if (mode === 'in') {
      if (!form.category_id) return toast.error('কী বাবদ এসেছে বেছে নিন');
      debit_account_id = form.account_id;     // asset increases
      credit_account_id = form.category_id;   // revenue/liability
      transaction_type = 'revenue';
    } else if (mode === 'out') {
      if (!form.category_id) return toast.error('কী বাবদ খরচ বেছে নিন');
      debit_account_id = form.category_id;    // expense/liability
      credit_account_id = form.account_id;    // asset decreases
      transaction_type = 'expense';
    } else {
      if (!form.category_id) return toast.error('কোথায় যাচ্ছে বেছে নিন');
      if (form.account_id === form.category_id) return toast.error('From ও To একাউন্ট একই হতে পারবে না');
      debit_account_id = form.category_id;    // destination asset increases
      credit_account_id = form.account_id;    // source asset decreases
      transaction_type = 'fund_transfer';
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
      if (form.proof) formData.append('proof', form.proof);

      await accountingApi.createTransaction(formData);
      toast.success('এন্ট্রি সেভ হয়েছে ✅');
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
            <h3 className="font-bold text-lg">{titles[mode]}</h3>
            <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">তারিখ *</label>
              <input type="date" className="input-field" value={form.transaction_date}
                onChange={e => set('transaction_date', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">পরিমাণ (৳) *</label>
              <input type="number" className="input-field" value={form.amount}
                onChange={e => set('amount', e.target.value)} />
            </div>

            {mode === 'in' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">কোথায় জমা হয়েছে? *</label>
                  <select className="input-field" value={form.account_id}
                    onChange={e => set('account_id', e.target.value)}>
                    <option value="">-- বেছে নিন --</option>
                    {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">কী বাবদ? *</label>
                  <select className="input-field" value={form.category_id}
                    onChange={e => set('category_id', e.target.value)}>
                    <option value="">-- বেছে নিন --</option>
                    {inCategoryOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">কার কাছ থেকে? (ঐচ্ছিক)</label>
                  <input type="text" className="input-field" value={form.party}
                    onChange={e => set('party', e.target.value)} placeholder="যেমন: স্টুডেন্টের নাম, ইনভেস্টর..." />
                </div>
              </>
            )}

            {mode === 'out' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">কোথা থেকে দেওয়া হয়েছে? *</label>
                  <select className="input-field" value={form.account_id}
                    onChange={e => set('account_id', e.target.value)}>
                    <option value="">-- বেছে নিন --</option>
                    {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">কী বাবদ খরচ? *</label>
                  <select className="input-field" value={form.category_id}
                    onChange={e => set('category_id', e.target.value)}>
                    <option value="">-- বেছে নিন --</option>
                    {outCategoryOptions.map(a => <option key={a.id} value={a.id}>{a.name}{a.account_type === 'liability' ? ' (পরিশোধ)' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">কাকে দেওয়া হয়েছে? (ঐচ্ছিক)</label>
                  <input type="text" className="input-field" value={form.party}
                    onChange={e => set('party', e.target.value)} placeholder="যেমন: স্টাফের নাম, প্রতিষ্ঠানের নাম..." />
                </div>
              </>
            )}

            {mode === 'transfer' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">কোথা থেকে (From) *</label>
                  <select className="input-field" value={form.account_id}
                    onChange={e => set('account_id', e.target.value)}>
                    <option value="">-- বেছে নিন --</option>
                    {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">কোথায় (To) *</label>
                  <select className="input-field" value={form.category_id}
                    onChange={e => set('category_id', e.target.value)}>
                    <option value="">-- বেছে নিন --</option>
                    {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">বিবরণ</label>
              <textarea className="input-field resize-none" rows={2} value={form.description}
                onChange={e => set('description', e.target.value)} placeholder="অতিরিক্ত তথ্য (ঐচ্ছিক)" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">প্রুফ / ভাউচার / চেক ছবি</label>
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
                  <span className="text-sm text-gray-400">ছবি আপলোড করুন (ঐচ্ছিক)</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files[0];
                    if (file) { set('proof', file); setProofPreview(URL.createObjectURL(file)); }
                  }} />
                </label>
              )}
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'সেভ হচ্ছে...' : '✅ এন্ট্রি সেভ করুন'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}