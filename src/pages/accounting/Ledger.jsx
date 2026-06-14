import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { format } from 'date-fns';

export default function Ledger() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ date_from: '', date_to: '' });

  useEffect(() => {
    accountingApi.getAllAccounts().then(r => setAccounts(r.data || []));
  }, []);

  const fetchLedger = (accId = selectedAccount, f = filters) => {
    if (!accId) return;
    setLoading(true);
    const params = {};
    if (f.date_from) params.date_from = f.date_from;
    if (f.date_to) params.date_to = f.date_to;
    accountingApi.getLedger(accId, params).then(r => {
      setLedger(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const handleAccountChange = (id) => {
    setSelectedAccount(id);
    if (id) fetchLedger(id);
    else setLedger(null);
  };

  const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  const groupedAccounts = ['asset', 'liability', 'equity', 'revenue', 'expense'].map(type => ({
    type,
    accounts: accounts.filter(a => a.account_type === type && a.is_active),
  }));

  const TYPE_LABELS = { asset: 'সম্পদ', liability: 'দায়', equity: 'মালিকানা', revenue: 'আয়', expense: 'খরচ' };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">লেজার</h1>

      <div className="card mb-4 space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">একাউন্ট বেছে নিন *</label>
          <select className="input-field" value={selectedAccount} onChange={e => handleAccountChange(e.target.value)}>
            <option value="">-- বেছে নিন --</option>
            {groupedAccounts.map(g => (
              <optgroup key={g.type} label={TYPE_LABELS[g.type]}>
                {g.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" className="input-field" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} />
          <input type="date" className="input-field" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchLedger()} className="btn-primary py-2 px-6" disabled={!selectedAccount}>খুঁজুন</button>
          <button onClick={() => { setFilters({ date_from: '', date_to: '' }); fetchLedger(selectedAccount, { date_from: '', date_to: '' }); }}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">রিসেট</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
      ) : ledger ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="card bg-gray-50">
              <p className="text-sm text-gray-500 mb-1">শুরুর ব্যালেন্স</p>
              <p className="text-xl font-bold">৳{Number(ledger.opening_balance).toLocaleString()}</p>
            </div>
            <div className="card bg-primary-50">
              <p className="text-sm text-gray-500 mb-1">শেষ ব্যালেন্স</p>
              <p className={`text-xl font-bold ${ledger.closing_balance < 0 ? 'text-red-500' : 'text-primary-600'}`}>৳{Number(ledger.closing_balance).toLocaleString()}</p>
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['তারিখ', 'বিবরণ', 'Debit', 'Credit', 'ব্যালেন্স'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ledger.entries.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-gray-400">কোনো এন্ট্রি নেই</td></tr>
                  ) : ledger.entries.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{format(new Date(e.entry_date), 'dd/MM/yy')}</td>
                      <td className="px-4 py-3 text-gray-600">{e.description || '—'}</td>
                      <td className="px-4 py-3 text-green-600 font-medium whitespace-nowrap">
                        {e.entry_type === 'debit' ? `৳${Number(e.amount).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-red-600 font-medium whitespace-nowrap">
                        {e.entry_type === 'credit' ? `৳${Number(e.amount).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">৳{Number(e.running_balance).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-12 text-gray-400">একাউন্ট বেছে নিন</div>
      )}
    </div>
  );
}