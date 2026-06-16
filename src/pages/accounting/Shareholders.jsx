import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { Users } from 'lucide-react';

export default function Shareholders() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountingApi.getShareholders().then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">Shareholders</h1>

      {!data || data.shareholders.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No shareholders added yet</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {data.shareholders.map(sh => (
              <div key={sh.id} className="card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="font-semibold">{sh.shareholder_name || sh.name}</p>
                    <p className="text-xs text-gray-400">Share: {sh.share_percentage}%</p>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Total Profit Received</p>
                  <p className="font-bold text-blue-600">Tk {Number(sh.total_profit_received).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={`card ${Math.abs(data.total_percentage - 100) > 0.01 ? 'bg-red-50' : 'bg-primary-50'}`}>
            <h3 className="font-semibold text-gray-700 mb-3">Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Total Share Allocated</p>
                <p className={`font-bold ${Math.abs(data.total_percentage - 100) > 0.01 ? 'text-red-600' : ''}`}>
                  {data.total_percentage}% {Math.abs(data.total_percentage - 100) > 0.01 && '⚠️'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Total Profit Distributed (All Time)</p>
                <p className="font-bold text-blue-600">Tk {Number(data.total_distributed).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}