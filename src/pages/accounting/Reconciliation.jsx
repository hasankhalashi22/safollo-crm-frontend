import { useState } from 'react';
import { accountingApi } from '../../api/client';
import { format } from 'date-fns';
import { CheckCircle, AlertTriangle, Search, RefreshCw } from 'lucide-react';

const METHOD_LABEL = {
  bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket',
  cash: 'Cash', cod: 'COD (Steadfast)',
};

export default function Reconciliation() {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [filters, setFilters] = useState({ date_from: firstOfMonth, date_to: today });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const r = await accountingApi.getReconciliation(filters);
      setData(r);
    } catch (e) { }
    setLoading(false);
  };

  const mismatched = data?.rows?.filter(r => !r.matched) || [];
  const matched = data?.rows?.filter(r => r.matched) || [];
  const arMismatched = data?.arReconciliation?.filter(r => !r.matched) || [];
  const arMatched = data?.arReconciliation?.filter(r => r.matched) || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-dark">Reconciliation</h1>
        <p className="text-gray-500 text-sm">CRM Sales vs Accounting — মিলিয়ে দেখুন</p>
      </div>

      {/* Filter */}
      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">From</label>
            <input type="date" className="input-field" value={filters.date_from}
              onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">To</label>
            <input type="date" className="input-field" value={filters.date_to}
              onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))} />
          </div>
        </div>
        <button onClick={fetch} disabled={loading}
          className="btn-primary py-2 px-6 flex items-center gap-2">
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
          {loading ? 'চেক করছে...' : 'চেক করুন'}
        </button>
      </div>

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="card text-center py-4">
              <p className="text-2xl font-bold text-gray-800">Tk {Number(data.summary.total_crm).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">CRM মোট Collection</p>
            </div>
            <div className="card text-center py-4">
              <p className="text-2xl font-bold text-gray-800">Tk {Number(data.summary.total_acc).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">Accounting মোট</p>
            </div>
            <div className={`card text-center py-4 ${data.summary.mismatch_count > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className={`text-2xl font-bold ${data.summary.mismatch_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {data.summary.mismatch_count}
              </p>
              <p className="text-xs text-gray-500 mt-1">Mismatch</p>
            </div>
            <div className="card text-center py-4 bg-green-50">
              <p className="text-2xl font-bold text-green-600">{data.summary.matched_count}</p>
              <p className="text-xs text-gray-500 mt-1">Matched</p>
            </div>
          </div>

          {/* Mismatch rows */}
          {mismatched.length > 0 && (
            <div>
              <h2 className="font-semibold text-red-600 flex items-center gap-2 mb-3">
                <AlertTriangle size={16} /> Mismatch ({mismatched.length}টি)
              </h2>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-red-50 border-b border-red-100">
                    <tr>
                      {['তারিখ', 'Method', 'CRM এন্ট্রি', 'CRM Amount', 'Accounting', 'Acc Amount', 'পার্থক্য'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {mismatched.map((r, i) => (
                      <tr key={i} className="hover:bg-red-50">
                        <td className="px-4 py-3 whitespace-nowrap font-medium">{r.date}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{METHOD_LABEL[r.method] || r.method}</td>
                        <td className="px-4 py-3 text-center">{r.crm_count}</td>
                        <td className="px-4 py-3 font-medium text-blue-600 whitespace-nowrap">Tk {Number(r.crm_total).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">{r.acc_count}</td>
                        <td className="px-4 py-3 font-medium text-blue-600 whitespace-nowrap">Tk {Number(r.acc_total).toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold whitespace-nowrap text-red-600">
                          {r.diff > 0 ? '+' : ''}{Number(r.diff).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Matched rows */}
          {matched.length > 0 && (
            <div>
              <h2 className="font-semibold text-green-600 flex items-center gap-2 mb-3">
                <CheckCircle size={16} /> Matched ({matched.length}টি)
              </h2>
              <div className="card p-0 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-green-50 border-b border-green-100">
                    <tr>
                      {['তারিখ', 'Method', 'CRM এন্ট্রি', 'CRM Amount', 'Accounting', 'Acc Amount'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {matched.map((r, i) => (
                      <tr key={i} className="hover:bg-green-50">
                        <td className="px-4 py-3 whitespace-nowrap font-medium">{r.date}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{METHOD_LABEL[r.method] || r.method}</td>
                        <td className="px-4 py-3 text-center">{r.crm_count}</td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">Tk {Number(r.crm_total).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">{r.acc_count}</td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">Tk {Number(r.acc_total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.rows.length === 0 && (
            <div className="card text-center py-12 text-gray-400">এই সময়ে কোনো data নেই</div>
          )}

          {/* AR vs CRM Dues Section */}
          <div>
            <h2 className="text-lg font-bold text-gray-700 mb-3">Accounts Receivable vs CRM বকেয়া</h2>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
              <div className="card text-center py-4">
                <p className="text-xl font-bold text-gray-800">Tk {Number(data.arSummary?.total_crm_due || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">CRM মোট বকেয়া</p>
              </div>
              <div className="card text-center py-4">
                <p className="text-xl font-bold text-gray-800">Tk {Number(data.arSummary?.total_acc_ar || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Accounting AR Balance</p>
              </div>
              <div className={`card text-center py-4 ${data.arSummary?.mismatch_count > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className={`text-xl font-bold ${data.arSummary?.mismatch_count > 0 ? 'text-red-600' : 'text-green-600'}`}>{data.arSummary?.mismatch_count}</p>
                <p className="text-xs text-gray-500 mt-1">Mismatch</p>
              </div>
              <div className="card text-center py-4 bg-green-50">
                <p className="text-xl font-bold text-green-600">{data.arSummary?.matched_count}</p>
                <p className="text-xs text-gray-500 mt-1">Matched</p>
              </div>
            </div>

            {arMismatched.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-red-600 flex items-center gap-2 mb-2">
                  <AlertTriangle size={15} /> Mismatch ({arMismatched.length}টি)
                </h3>
                <div className="card p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50 border-b border-red-100">
                      <tr>
                        {['ছাত্র', 'ফোন', 'কোর্স', 'কোর্স মূল্য', 'সংগ্রহ', 'CRM বকেয়া', 'ACC AR', 'পার্থক্য'].map(h => (
                          <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {arMismatched.map((r, i) => (
                        <tr key={i} className="hover:bg-red-50">
                          <td className="px-3 py-2 font-medium">{r.student_name}</td>
                          <td className="px-3 py-2 text-gray-500">{r.student_phone}</td>
                          <td className="px-3 py-2">{r.course_name}</td>
                          <td className="px-3 py-2 whitespace-nowrap">Tk {r.course_price.toLocaleString()}</td>
                          <td className="px-3 py-2 whitespace-nowrap">Tk {r.total_collected.toLocaleString()}</td>
                          <td className="px-3 py-2 font-medium text-blue-600 whitespace-nowrap">Tk {r.crm_due.toLocaleString()}</td>
                          <td className="px-3 py-2 font-medium text-blue-600 whitespace-nowrap">Tk {r.acc_ar_balance.toLocaleString()}</td>
                          <td className="px-3 py-2 font-bold text-red-600 whitespace-nowrap">
                            {r.diff > 0 ? '+' : ''}{r.diff.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {arMatched.length > 0 && (
              <div>
                <h3 className="font-semibold text-green-600 flex items-center gap-2 mb-2">
                  <CheckCircle size={15} /> Matched ({arMatched.length}টি)
                </h3>
                <div className="card p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-green-50 border-b border-green-100">
                      <tr>
                        {['ছাত্র', 'ফোন', 'কোর্স', 'কোর্স মূল্য', 'সংগ্রহ', 'বকেয়া'].map(h => (
                          <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {arMatched.map((r, i) => (
                        <tr key={i} className="hover:bg-green-50">
                          <td className="px-3 py-2 font-medium">{r.student_name}</td>
                          <td className="px-3 py-2 text-gray-500">{r.student_phone}</td>
                          <td className="px-3 py-2">{r.course_name}</td>
                          <td className="px-3 py-2 whitespace-nowrap">Tk {r.course_price.toLocaleString()}</td>
                          <td className="px-3 py-2 whitespace-nowrap">Tk {r.total_collected.toLocaleString()}</td>
                          <td className="px-3 py-2 font-medium whitespace-nowrap">Tk {r.crm_due.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {data.arReconciliation?.length === 0 && (
              <div className="card text-center py-8 text-gray-400">কোনো বকেয়া নেই</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
