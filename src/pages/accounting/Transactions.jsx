import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Plus, Trash2, Camera, X } from 'lucide-react';

const TRANSACTION_TYPES = [
  { value: 'revenue', label: 'আয় এন্ট্রি (Revenue)' },
  { value: 'expense', label: 'খরচ এন্ট্রি (Expense)' },
  { value: 'bank_withdrawal', label: 'ব্যাংক উইথড্রয়াল' },
  { value: 'fund_transfer', label: 'ফান্ড ট্রান্সফার' },
  { value: 'credit_card_payment', label: 'ক্রেডিট কার্ড পেমেন্ট' },
  { value: 'investor_payment', label: 'ইনভেস্টর পেমেন্ট' },
  { value: 'salary_payment', label: 'বেতন পেমেন্ট' },
  { value: 'teacher_payment', label: 'টিচার পেমেন্ট' },
  { value: 'steadfast_withdrawal', label: 'Steadfast উইথড্রয়াল' },
  { value: 'adjusting_entry', label: 'এডজাস্টিং এন্ট্রি' },
];

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
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
    if (!confirm('এই ট্রানজেকশন delete করবেন?')) return;
    try {
      await accountingApi.deleteTransaction(txn.id);
      toast.success('ট্রানজেকশন delete হয়েছে ✅');
      fetchTransactions();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  const typeLabel = (val) => TRANSACTION_TYPES.find(t => t.value === val)?.label || val;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark">ট্রানজেকশন</h1>
          <p className="text-gray-500 text-sm">মোট {total}টি রেকর্ড</p>
        </div>
        <button onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95">
          <Plus size={16} /> নতুন এন্ট্রি
        </button>
      </div>

      <div className="card mb-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <select className="input-field" value={filters.transaction_type} onChange={e => setFilter('transaction_type', e.target.value)}>
            <option value="">সব টাইপ</option>
            {TRANSACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input type="date" className="input-field" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} />
          <input type="date" className="input-field" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchTransactions()} className="btn-primary py-2 px-6">খুঁজুন</button>
          <button onClick={() => { setFilters({ date_from: '', date_to: '', transaction_type: '' }); fetchTransactions({ date_from: '', date_to: '', transaction_type: '' }); }}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">রিসেট</button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['তারিখ', 'টাইপ', 'বিবরণ', 'Debit', 'Credit', 'পরিমাণ', 'তৈরি করেছেন', 'অ্যাকশন'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">লোড হচ্ছে...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">কোনো রেকর্ড নেই</td></tr>
              ) : transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{format(new Date(t.transaction_date), 'dd/MM/yy')}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-primary-50 text-primary-600 px-2 py-1 rounded-full">{typeLabel(t.transaction_type)}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.description || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{t.debit_account_name}</td>
                  <td className="px-4 py-3 text-gray-500">{t.credit_account_name}</td>
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

      {createModal && (
        <TransactionModal
          onClose={() => setCreateModal(false)}
          onSuccess={() => { setCreateModal(false); fetchTransactions(); }}
        />
      )}
    </div>
  );
}

function TransactionModal({ onClose, onSuccess }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [proofPreview, setProofPreview] = useState(null);
  const [form, setForm] = useState({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    transaction_type: '',
    description: '',
    amount: '',
    debit_account_id: '',
    credit_account_id: '',
    reference_no: '',
    proof: null,
    proof_type: 'voucher',
  });

  useEffect(() => {
    accountingApi.getAllAccounts().then(r => setAccounts(r.data || []));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.transaction_type) return toast.error('ট্রানজেকশন টাইপ বেছে নিন');
    if (!form.debit_account_id) return toast.error('Debit একাউন্ট বেছে নিন');
    if (!form.credit_account_id) return toast.error('Credit একাউন্ট বেছে নিন');
    if (form.debit_account_id === form.credit_account_id) return toast.error('Debit ও Credit একাউন্ট একই হতে পারবে না');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('সঠিক পরিমাণ দিন');

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== null && val !== '' && key !== 'proof') formData.append(key, val);
      });
      if (form.proof) formData.append('proof', form.proof);
      await accountingApi.createTransaction(formData);
      toast.success('ট্রানজেকশন রেকর্ড হয়েছে ✅');
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
            <h3 className="font-bold text-lg">নতুন ট্রানজেকশন এন্ট্রি</h3>
            <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">ট্রানজেকশন টাইপ *</label>
              <select className="input-field" value={form.transaction_type}
                onChange={e => set('transaction_type', e.target.value)}>
                <option value="">-- বেছে নিন --</option>
                {TRANSACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

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

            <div>
              <label className="block text-sm font-medium mb-1.5">Debit একাউন্ট (যেখানে টাকা যাচ্ছে/বাড়ছে) *</label>
              <select className="input-field" value={form.debit_account_id}
                onChange={e => set('debit_account_id', e.target.value)}>
                <option value="">-- বেছে নিন --</option>
                {accounts.filter(a => a.is_active).map(a => (
                  <option key={a.id} value={a.id}>[{a.account_type}] {a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Credit একাউন্ট (যেখান থেকে টাকা আসছে/কমছে) *</label>
              <select className="input-field" value={form.credit_account_id}
                onChange={e => set('credit_account_id', e.target.value)}>
                <option value="">-- বেছে নিন --</option>
                {accounts.filter(a => a.is_active).map(a => (
                  <option key={a.id} value={a.id}>[{a.account_type}] {a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">বিবরণ</label>
              <textarea className="input-field resize-none" rows={2} value={form.description}
                onChange={e => set('description', e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">রেফারেন্স নম্বর</label>
              <input type="text" className="input-field" value={form.reference_no}
                onChange={e => set('reference_no', e.target.value)} />
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
                  <span className="text-sm text-gray-400">ছবি আপলোড করুন</span>
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