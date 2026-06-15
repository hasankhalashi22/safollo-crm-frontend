import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

export default function Investors() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountingApi.getInvestors().then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">Investors</h1>

      {!data || data.investors.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No investors added yet</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.investors.map(inv => (
            <div key={inv.id} className="card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="font-semibold">{inv.investor_name || inv.name}</p>
                  {inv.profit_rate && <p className="text-xs text-gray-400">Annual Profit Rate: {inv.profit_rate}%</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Principal</p>
                  <p className="font-bold">Tk {Number(inv.principal).toLocaleString()}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Accrued Profit (Due)</p>
                  <p className="font-bold text-amber-600">Tk {Number(inv.accrued_profit).toLocaleString()}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Total Profit Paid</p>
                  <p className="font-bold text-blue-600">Tk {Number(inv.total_profit_paid).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Days Accrued</p>
                  <p className="font-bold">{inv.days_accrued} days</p>
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-500 border-t border-gray-100 pt-2">
                {inv.contract_start_date && (
                  <div className="flex justify-between">
                    <span>Contract Start</span>
                    <span>{format(new Date(inv.contract_start_date), 'dd/MM/yyyy')}</span>
                  </div>
                )}
                {inv.contract_end_date && (
                  <div className="flex justify-between">
                    <span>Contract End</span>
                    <span>{format(new Date(inv.contract_end_date), 'dd/MM/yyyy')}</span>
                  </div>
                )}
                {inv.last_payment_date && (
                  <div className="flex justify-between">
                    <span>Last Profit Payment</span>
                    <span>{format(new Date(inv.last_payment_date), 'dd/MM/yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}