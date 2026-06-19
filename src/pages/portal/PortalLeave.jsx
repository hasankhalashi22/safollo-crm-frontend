import { useState, useEffect } from 'react';
import { leaveApi } from '../../api/client';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function PortalLeave() {
  const [balances, setBalances] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyModal, setApplyModal] = useState(false);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      leaveApi.getMyBalances(),
      leaveApi.getMyApplications(),
    ]).then(([b, a]) => {
      setBalances(b.data || []);
      setApplications(a.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-dark">আমার ছুটি</h1>
        <button onClick={() => setApplyModal(true)}
          className="flex items-center gap-1.5 bg-primary-500 text-white px-3 py-2 rounded-xl text-sm font-medium">
          <Plus size={16} /> আবেদন করুন
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {balances.length === 0 ? (
          <p className="col-span-2 text-center py-8 text-gray-400 text-sm">কোনো ছুটির হিসাব এখনো নেই</p>
        ) : balances.map(b => (
          <div key={b.leave_type_id} className="card py-3">
            <p className="text-xs text-gray-400">{b.name_bn}</p>
            <p className="text-lg font-bold text-primary-600">{b.remaining_days} <span className="text-xs font-normal text-gray-400">/ {b.total_days} দিন</span></p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-semibold text-gray-700 mb-2">আবেদনের ইতিহাস</h3>
        <div className="card p-0 overflow-hidden">
          {applications.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">কোনো আবেদন নেই</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {applications.map(app => (
                <div key={app.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{app.leave_type_name_bn}</p>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="text-xs text-gray-400">
                    {format(new Date(app.start_date), 'dd MMM')} – {format(new Date(app.end_date), 'dd MMM, yyyy')} ({app.duration_days} দিন)
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {applyModal && (
        <ApplyLeaveModal balances={balances} onClose={() => setApplyModal(false)} onSuccess={() => { setApplyModal(false); fetchAll(); }} />
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    approved: { label: 'Approved', cls: 'bg-green-50 text-green-600' },
    rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-500' },
    pending_check: { label: 'অপেক্ষমান (Check)', cls: 'bg-amber-50 text-amber-600' },
    pending_consent: { label: 'অপেক্ষমান (Consent)', cls: 'bg-amber-50 text-amber-600' },
    pending_approval: { label: 'অপেক্ষমান (Approval)', cls: 'bg-amber-50 text-amber-600' },
  };
  const info = map[status] || { label: status, cls: 'bg-gray-100 text-gray-500' };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${info.cls}`}>{info.label}</span>;
}

function ApplyLeaveModal({ balances, onClose, onSuccess }) {
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!leaveTypeId || !startDate || !endDate) return toast.error('সব তথ্য দিন');
    setLoading(true);
    try {
      await leaveApi.applyLeave({
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: isHalfDay ? startDate : endDate,
        is_half_day: isHalfDay,
        reason,
      });
      toast.success('আবেদন জমা হয়েছে ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">ছুটির আবেদন</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">ছুটির ধরন *</label>
            <select className="input-field" value={leaveTypeId} onChange={e => setLeaveTypeId(e.target.value)}>
              <option value="">-- বেছে নিন --</option>
              {balances.map(b => (
                <option key={b.leave_type_id} value={b.leave_type_id}>{b.name_bn} (বাকি: {b.remaining_days} দিন)</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={isHalfDay} onChange={e => setIsHalfDay(e.target.checked)} />
            <label className="text-sm">অর্ধ দিবস</label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">শুরুর তারিখ *</label>
            <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          {!isHalfDay && (
            <div>
              <label className="block text-sm font-medium mb-1.5">শেষ তারিখ *</label>
              <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">কারণ</label>
            <textarea className="input-field resize-none" rows={2} value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'জমা হচ্ছে...' : '✅ আবেদন জমা দিন'}
          </button>
        </form>
      </div>
    </div>
  );
}