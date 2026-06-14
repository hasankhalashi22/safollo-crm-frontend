import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import toast from 'react-hot-toast';
import { Plus, Edit2 } from 'lucide-react';

const TYPE_LABELS = {
  asset: 'সম্পদ (Asset)',
  liability: 'দায় (Liability)',
  equity: 'মালিকানা (Equity)',
  revenue: 'আয় (Revenue)',
  expense: 'খরচ (Expense)',
};

const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(null);
  const [editModal, setEditModal] = useState(null);

  const fetchAccounts = () => {
    setLoading(true);
    accountingApi.getAllAccounts().then(r => {
      setAccounts(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchAccounts(); }, []);

  const grouped = TYPE_ORDER.map(type => ({
    type,
    label: TYPE_LABELS[type],
    accounts: accounts.filter(a => a.account_type === type),
  }));

  if (loading) return <div className="flex justify-center h-64 items-center"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-dark">একাউন্ট ম্যানেজমেন্ট</h1>
        <button onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95">
          <Plus size={16} /> নতুন একাউন্ট
        </button>
      </div>

      <div className="space-y-6">
        {grouped.map(group => (
          <div key={group.type} className="card p-0 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700">{group.label}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {group.accounts.length === 0 ? (
                <p className="text-center py-6 text-gray-400 text-sm">কোনো একাউন্ট নেই</p>
              ) : group.accounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">
                      {acc.code && <span className="text-gray-400 mr-2">{acc.code}</span>}
                      {acc.name}
                      {acc.bank_name && <span className="text-gray-400 text-xs ml-2">({acc.bank_name})</span>}
                    </p>
                    {acc.account_subtype && <p className="text-xs text-gray-400">{acc.account_subtype}</p>}
                    {!acc.is_active && <span className="text-xs text-red-500">নিষ্ক্রিয়</span>}
                  </div>
                  <button onClick={() => setEditModal(acc)}
                    className="px-2 py-1 bg-primary-50 text-primary-600 rounded-lg text-xs font-medium">
                    <Edit2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {createModal && (
        <AccountModal
          onClose={() => setCreateModal(null)}
          onSuccess={() => { setCreateModal(null); fetchAccounts(); }}
        />
      )}
      {editModal && (
        <AccountModal
          account={editModal}
          onClose={() => setEditModal(null)}
          onSuccess={() => { setEditModal(null); fetchAccounts(); }}
        />
      )}
    </div>
  );
}

function AccountModal({ account, onClose, onSuccess }) {
  const isEdit = !!account;
  const [form, setForm] = useState({
    code: account?.code || '',
    name: account?.name || '',
    account_type: account?.account_type || 'expense',
    account_subtype: account?.account_subtype || '',
    is_active: account?.is_active ?? true,
    bank_name: account?.bank_name || '',
    credit_limit: account?.credit_limit || '',
    interest_rate: account?.interest_rate || '',
    investor_name: account?.investor_name || '',
    principal_amount: account?.principal_amount || '',
    profit_rate: account?.profit_rate || '',
    contract_start_date: account?.contract_start_date?.split('T')[0] || '',
    contract_end_date: account?.contract_end_date?.split('T')[0] || '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('একাউন্টের নাম দিন');
    setLoading(true);
    try {
      if (isEdit) {
        await accountingApi.updateAccount(account.id, form);
        toast.success('একাউন্ট আপডেট হয়েছে ✅');
      } else {
        await accountingApi.createAccount(form);
        toast.success('একাউন্ট তৈরি হয়েছে ✅');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">{isEdit ? 'একাউন্ট এডিট করুন' : 'নতুন একাউন্ট'}</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium mb-1.5">টাইপ *</label>
              <select className="input-field" value={form.account_type}
                onChange={e => set('account_type', e.target.value)}>
                <option value="asset">সম্পদ (Asset)</option>
                <option value="liability">দায় (Liability)</option>
                <option value="equity">মালিকানা (Equity)</option>
                <option value="revenue">আয় (Revenue)</option>
                <option value="expense">খরচ (Expense)</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">নাম *</label>
            <input type="text" className="input-field" value={form.name}
              onChange={e => set('name', e.target.value)} />
          </div>
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium mb-1.5">কোড</label>
              <input type="text" className="input-field" placeholder="যেমন: 5009" value={form.code}
                onChange={e => set('code', e.target.value)} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">সাব-টাইপ</label>
            <input type="text" className="input-field" placeholder="যেমন: credit_card, investor_loan"
              value={form.account_subtype} onChange={e => set('account_subtype', e.target.value)} />
          </div>

          {(form.account_type === 'liability' && form.account_subtype === 'credit_card') && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">ব্যাংকের নাম</label>
                <input type="text" className="input-field" value={form.bank_name}
                  onChange={e => set('bank_name', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">ক্রেডিট লিমিট</label>
                  <input type="number" className="input-field" value={form.credit_limit}
                    onChange={e => set('credit_limit', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">ইন্টারেস্ট রেট %</label>
                  <input type="number" className="input-field" value={form.interest_rate}
                    onChange={e => set('interest_rate', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {(form.account_subtype === 'investor_loan') && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">ইনভেস্টরের নাম</label>
                <input type="text" className="input-field" value={form.investor_name}
                  onChange={e => set('investor_name', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">মূলধন</label>
                  <input type="number" className="input-field" value={form.principal_amount}
                    onChange={e => set('principal_amount', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">প্রফিট রেট %</label>
                  <input type="number" className="input-field" value={form.profit_rate}
                    onChange={e => set('profit_rate', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">চুক্তি শুরু</label>
                  <input type="date" className="input-field" value={form.contract_start_date}
                    onChange={e => set('contract_start_date', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">চুক্তি শেষ</label>
                  <input type="date" className="input-field" value={form.contract_end_date}
                    onChange={e => set('contract_end_date', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {isEdit && (
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active}
                onChange={e => set('is_active', e.target.checked)} />
              <label className="text-sm">সক্রিয়</label>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'সেভ হচ্ছে...' : '✅ সেভ করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}