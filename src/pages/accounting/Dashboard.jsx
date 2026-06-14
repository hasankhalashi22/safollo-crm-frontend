import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Wallet, CreditCard } from 'lucide-react';

export default function AccountingDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountingApi.getDashboard().then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>;
  if (!data) return null;

  const { summary, assets, liabilities, total_assets, total_liabilities, recent_transactions } = data;

const highlightNames = ['BRAC Bank', 'Nagad Wallet', 'Dutch Bangla Bank', 'Petty Cash'];
  const highlightAccounts = highlightNames.map(name => assets.find(a => a.name === name)).filter(Boolean);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-display font-bold text-dark">একাউন্টিং ড্যাশবোর্ড</h1>

      {/* Today's bKash */}
      <div className="card bg-gradient-to-br from-pink-50 to-white border border-pink-100">
        <p className="text-sm text-gray-500 mb-1">আজকের বিকাশ কালেকশন</p>
        <p className="text-2xl font-bold text-pink-600">৳{Number(data.today_bkash).toLocaleString()}</p>
        <p className="text-xs text-gray-400 mt-1">রাত ১:০০ টায় রিসেট ও সেটেলমেন্ট হবে</p>
      </div>

      {/* Key account balances */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {highlightAccounts.map(a => (
          <div key={a.id} className="card bg-gradient-to-br from-primary-50 to-white border border-primary-100">
            <p className="text-sm text-gray-500 mb-1">{a.name}</p>
            <p className={`text-xl font-bold ${a.balance < 0 ? 'text-red-500' : 'text-primary-600'}`}>৳{Number(a.balance).toLocaleString()}</p>
          </div>
        ))}
      </div>
      {/* Today/Month summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<TrendingUp className="text-green-500" size={20} />} label="আজকের আয়" value={summary.today_in} bg="bg-green-50" />
        <StatCard icon={<TrendingDown className="text-red-500" size={20} />} label="আজকের খরচ" value={summary.today_out} bg="bg-red-50" />
        <StatCard icon={<TrendingUp className="text-green-500" size={20} />} label="মাসের আয়" value={summary.month_in} bg="bg-green-50" />
        <StatCard icon={<TrendingDown className="text-red-500" size={20} />} label="মাসের খরচ" value={summary.month_out} bg="bg-red-50" />
      </div>

      {/* Total Assets / Liabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card bg-primary-50">
          <p className="text-sm text-gray-500 mb-1">মোট সম্পদ (Total Assets)</p>
          <p className="text-2xl font-bold text-primary-600">৳{Number(total_assets).toLocaleString()}</p>
        </div>
        <div className="card bg-orange-50">
          <p className="text-sm text-gray-500 mb-1">মোট দায় (Total Liabilities)</p>
          <p className="text-2xl font-bold text-orange-600">৳{Number(total_liabilities).toLocaleString()}</p>
        </div>
      </div>

      {/* Asset Accounts */}
      <div className="card">
        <h3 className="font-semibold text-dark mb-3 flex items-center gap-2"><Wallet size={18} /> একাউন্ট ব্যালেন্স</h3>
        <div className="space-y-2">
          {assets.map(a => (
            <div key={a.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                {a.account_subtype && <p className="text-xs text-gray-400">{a.account_subtype}</p>}
              </div>
              <p className={`font-semibold ${a.balance < 0 ? 'text-red-500' : 'text-dark'}`}>৳{Number(a.balance).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Liability Accounts */}
      {liabilities.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-dark mb-3 flex items-center gap-2"><CreditCard size={18} /> দায় (Liabilities)</h3>
          <div className="space-y-2">
            {liabilities.map(a => (
              <div key={a.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{a.name}{a.bank_name ? ` (${a.bank_name})` : ''}</p>
                  {a.account_subtype && <p className="text-xs text-gray-400">{a.account_subtype}</p>}
                </div>
                <p className="font-semibold text-orange-600">৳{Number(a.balance).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="card">
        <h3 className="font-semibold text-dark mb-3">সাম্প্রতিক এন্ট্রি</h3>
        {recent_transactions.length === 0 ? (
          <p className="text-center py-6 text-gray-400 text-sm">কোনো এন্ট্রি নেই</p>
        ) : (
          <div className="space-y-2">
            {recent_transactions.map(t => (
              <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm">{t.description || t.transaction_type}</p>
                  <p className="text-xs text-gray-400">{format(new Date(t.transaction_date), 'dd/MM/yyyy')} • {t.debit_account_name} ← {t.credit_account_name}</p>
                </div>
                <p className={`font-semibold ${t.transaction_type === 'revenue' ? 'text-green-600' : t.transaction_type === 'expense' ? 'text-red-600' : 'text-blue-600'}`}>
                  ৳{Number(t.amount).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }) {
  return (
    <div className={`${bg} rounded-2xl p-3.5`}>
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <p className="text-xl font-bold text-dark">৳{Number(value).toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}