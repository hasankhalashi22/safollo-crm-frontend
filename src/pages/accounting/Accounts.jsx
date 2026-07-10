import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const TYPE_LABELS = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expense',
};

const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];

export default function Accounts() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(null);
  const [editModal, setEditModal] = useState(null);

  const handleDelete = async (acc) => {
    if (!window.confirm(`"${acc.name}" একাউন্ট মুছে ফেলবেন?`)) return;
    try {
      await accountingApi.deleteAccount(acc.id);
      toast.success('একাউন্ট মুছে ফেলা হয়েছে');
      fetchAccounts();
    } catch (e) {
      toast.error(e?.message || 'সমস্যা হয়েছে');
    }
  };

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
        <h1 className="text-2xl font-display font-bold text-dark">Chart of Accounts</h1>
        <button onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95">
          <Plus size={16} /> New Account
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
                <p className="text-center py-6 text-gray-400 text-sm">No accounts</p>
              ) : group.accounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">
                      {acc.code && <span className="text-gray-400 mr-2">{acc.code}</span>}
                      {acc.name}
                      {acc.bank_name && <span className="text-gray-400 text-xs ml-2">({acc.bank_name})</span>}
                    </p>
                    {acc.account_subtype && <p className="text-xs text-gray-400">{acc.account_subtype}</p>}
                    {!acc.is_active && <span className="text-xs text-red-500">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditModal(acc)}
                      className="px-2 py-1 bg-primary-50 text-primary-600 rounded-lg text-xs font-medium">
                      <Edit2 size={14} />
                    </button>
                    {isSuperAdmin && (
                      <button onClick={() => handleDelete(acc)}
                        className="px-2 py-1 bg-red-50 text-red-500 rounded-lg text-xs font-medium">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
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
  const isCreditCard = account?.account_subtype === 'credit_card';
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingBalanceUsd, setOpeningBalanceUsd] = useState('');
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
    shareholder_name: account?.shareholder_name || '',
    share_percentage: account?.share_percentage || '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('Enter account name');
    setLoading(true);
    try {
      if (isEdit) {
        await accountingApi.updateAccount(account.id, form);
        if (isCreditCard && (openingBalance !== '' || openingBalanceUsd !== '')) {
          await accountingApi.setOpeningBalance(account.id, parseFloat(openingBalance) || 0, parseFloat(openingBalanceUsd) || 0);
        }
        toast.success('Account updated ✅');
      } else {
        await accountingApi.createAccount(form);
        toast.success('Account created ✅');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">{isEdit ? 'Edit Account' : 'New Account'}</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Type *</label>
              <select className="input-field" value={form.account_type}
                onChange={e => set('account_type', e.target.value)}>
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="equity">Equity</option>
                <option value="revenue">Revenue</option>
                <option value="expense">Expense</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">Name *</label>
            <input type="text" className="input-field" value={form.name}
              onChange={e => set('name', e.target.value)} />
          </div>
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Code</label>
              <input type="text" className="input-field" placeholder="e.g. 5009" value={form.code}
                onChange={e => set('code', e.target.value)} />
            </div>
          )}
         <div>
            <label className="block text-sm font-medium mb-1.5">Subtype</label>
            <select className="input-field" value={form.account_subtype}
              onChange={e => set('account_subtype', e.target.value)}>
              <option value="">-- None --</option>
              <option value="cash">Cash</option>
              <option value="mobile_wallet">Mobile Wallet</option>
              <option value="bank">Bank</option>
              <option value="credit_card">Credit Card</option>
              <option value="investor_loan">Investor Loan</option>
              <option value="shareholder">Shareholder</option>
            </select>
          </div>

          {(form.account_type === 'liability' && form.account_subtype === 'credit_card') && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Bank Name</label>
                <input type="text" className="input-field" value={form.bank_name}
                  onChange={e => set('bank_name', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Credit Limit</label>
                  <input type="number" className="input-field" value={form.credit_limit}
                    onChange={e => set('credit_limit', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Interest Rate %</label>
                  <input type="number" className="input-field" value={form.interest_rate}
                    onChange={e => set('interest_rate', e.target.value)} />
                </div>
              </div>
            </>
          )}

{(form.account_subtype === 'shareholder') && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Shareholder Name</label>
                <input type="text" className="input-field" value={form.shareholder_name}
                  onChange={e => set('shareholder_name', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Share Percentage (%)</label>
                <input type="number" step="0.01" className="input-field" value={form.share_percentage}
                  onChange={e => set('share_percentage', e.target.value)} placeholder="e.g. 30" />
              </div>
            </>
          )}

       

          {(form.account_subtype === 'investor_loan') && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Investor Name</label>
                <input type="text" className="input-field" value={form.investor_name}
                  onChange={e => set('investor_name', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Principal Amount</label>
                  <input type="number" className="input-field" value={form.principal_amount}
                    onChange={e => set('principal_amount', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Profit Rate %</label>
                  <input type="number" className="input-field" value={form.profit_rate}
                    onChange={e => set('profit_rate', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Contract Start</label>
                  <input type="date" className="input-field" value={form.contract_start_date}
                    onChange={e => set('contract_start_date', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Contract End</label>
                  <input type="date" className="input-field" value={form.contract_end_date}
                    onChange={e => set('contract_end_date', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {isEdit && isCreditCard && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
              <p className="text-sm font-medium">Set Opening Balance</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">BDT Outstanding (৳)</label>
                  <input type="number" className="input-field" placeholder="0"
                    value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">USD Outstanding ($)</label>
                  <input type="number" className="input-field" placeholder="0"
                    value={openingBalanceUsd} onChange={e => setOpeningBalanceUsd(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-amber-600">⚠️ Save করলে এই কার্ডের আগের সব ডাটা মুছে যাবে। খালি রাখলে কিছু হবে না।</p>
            </div>
          )}

          {isEdit && (
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active}
                onChange={e => set('is_active', e.target.checked)} />
              <label className="text-sm">Active</label>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : '✅ Save'}
          </button>
        </form>
      </div>
    </div>
  );
}