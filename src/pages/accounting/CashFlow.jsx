import { useState, useEffect } from 'react';
import { accountingApi } from '../../api/client';
import { format, startOfMonth } from 'date-fns';
import { exportAccountingPdf } from '../../utils/accountingPdf';
import { Download } from 'lucide-react';
import SignatoryModal from '../../components/SignatoryModal';

export default function CashFlow() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showSignModal, setShowSignModal] = useState(false);

  const fetchData = () => {
    setLoading(true);
    accountingApi.getCashFlow({ date_from: dateFrom, date_to: dateTo }).then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleDownloadPdf = ({ mdName, ceoName }) => {
    if (!data) return;
    const period = `${format(new Date(dateFrom), 'dd/MM/yyyy')} to ${format(new Date(dateTo), 'dd/MM/yyyy')}`;

    const opRows = data.operating_items.map(i => `<tr><td>${i.label}</td><td>Tk ${Number(i.amount).toLocaleString()}</td></tr>`).join('');
    const finRows = data.financing_items.map(i => `<tr><td>${i.label}</td><td>Tk ${Number(i.amount).toLocaleString()}</td></tr>`).join('');

    const tableHtml = `
      <table>
        <thead><tr><th colspan="2">Cash Flow from Operating Activities</th></tr></thead>
        <tbody>${opRows || '<tr><td colspan="2">No items</td></tr>'}</tbody>
        <tfoot><tr><td>Net Cash from Operating</td><td>Tk ${Number(data.net_operating).toLocaleString()}</td></tr></tfoot>
      </table>
      <table>
        <thead><tr><th colspan="2">Cash Flow from Financing Activities</th></tr></thead>
        <tbody>${finRows || '<tr><td colspan="2">No items</td></tr>'}</tbody>
        <tfoot><tr><td>Net Cash from Financing</td><td>Tk ${Number(data.net_financing).toLocaleString()}</td></tr></tfoot>
      </table>
      <table>
        <tbody>
          <tr><td>Net Increase/Decrease in Cash</td><td>Tk ${Number(data.net_change).toLocaleString()}</td></tr>
          <tr><td>Beginning Cash Balance</td><td>Tk ${Number(data.beginning_cash).toLocaleString()}</td></tr>
        </tbody>
        <tfoot><tr><td style="font-size:14px">Ending Cash Balance</td><td style="font-size:14px">Tk ${Number(data.ending_cash).toLocaleString()}</td></tr></tfoot>
      </table>`;

    exportAccountingPdf({ title: 'Statement of Cash Flows', period, tableHtml, mdName, ceoName });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">নগদ প্রবাহ বিবরণী (Cash Flow Statement)</h1>

      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">শুরুর তারিখ</label>
          <input type="date" className="input-field" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">শেষ তারিখ</label>
          <input type="date" className="input-field" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <button onClick={fetchData} className="btn-primary py-2.5 px-6">দেখুন</button>
        <button onClick={() => setShowSignModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium ml-auto">
          <Download size={16} /> PDF
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
      ) : data ? (
        <div className="card space-y-4">
          {/* Operating */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">পরিচালনা কার্যক্রম থেকে নগদ প্রবাহ (Operating Activities)</h3>
            {data.operating_items.length === 0 ? (
              <p className="text-gray-400 text-sm py-2">কোনো এন্ট্রি নেই</p>
            ) : data.operating_items.map((i, idx) => (
              <div key={idx} className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-600">{i.label}</span>
                <span className={`font-medium ${i.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>৳{Number(i.amount).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-semibold">
              <span>নেট অপারেটিং নগদ প্রবাহ</span>
              <span className={data.net_operating < 0 ? 'text-red-500' : 'text-green-600'}>৳{Number(data.net_operating).toLocaleString()}</span>
            </div>
          </div>

          {/* Financing */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-100">অর্থায়ন কার্যক্রম থেকে নগদ প্রবাহ (Financing Activities)</h3>
            {data.financing_items.length === 0 ? (
              <p className="text-gray-400 text-sm py-2">কোনো এন্ট্রি নেই</p>
            ) : data.financing_items.map((i, idx) => (
              <div key={idx} className="flex justify-between py-1.5 text-sm">
                <span className="text-gray-600">{i.label}</span>
                <span className="font-medium text-red-500">৳{Number(i.amount).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 mt-1 border-t border-gray-100 font-semibold">
              <span>নেট ফাইন্যান্সিং নগদ প্রবাহ</span>
              <span className={data.net_financing < 0 ? 'text-red-500' : 'text-green-600'}>৳{Number(data.net_financing).toLocaleString()}</span>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm">
              <span>নেট বৃদ্ধি/হ্রাস (Net Change in Cash)</span>
              <span className={`font-semibold ${data.net_change < 0 ? 'text-red-500' : 'text-green-600'}`}>৳{Number(data.net_change).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>শুরুর নগদ ব্যালেন্স</span>
              <span className="font-semibold">৳{Number(data.beginning_cash).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-primary-50 rounded-xl font-bold">
              <span>শেষের নগদ ব্যালেন্স</span>
              <span className="text-primary-600">৳{Number(data.ending_cash).toLocaleString()}</span>
            </div>
          </div>
        </div>
      ) : null}

      {showSignModal && (
        <SignatoryModal
          onClose={() => setShowSignModal(false)}
          onConfirm={(names) => { setShowSignModal(false); handleDownloadPdf(names); }}
        />
      )}
    </div>
  );
}