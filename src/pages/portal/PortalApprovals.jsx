import { useState, useEffect } from 'react';
import { leaveApi } from '../../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PortalApprovals() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null);

  const fetchQueue = () => {
    setLoading(true);
    leaveApi.getMyApprovalQueue().then(r => {
      setQueue(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchQueue(); }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  const stageLabel = (status) => {
    if (status === 'pending_check') return 'Check প্রয়োজন';
    if (status === 'pending_consent') return 'Consent প্রয়োজন';
    if (status === 'pending_approval') return 'Approval প্রয়োজন';
    return status;
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-dark">আমার অনুমোদন তালিকা</h1>

      {queue.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">কোনো আবেদন অপেক্ষমান নেই</div>
      ) : (
        <div className="space-y-3">
          {queue.map(app => (
            <div key={app.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm">{app.employee_name}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{stageLabel(app.status)}</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{app.designation || '—'} {app.department ? `• ${app.department}` : ''}</p>
              <div className="text-sm space-y-1 mb-3">
                <p><span className="text-gray-500">ধরন:</span> {app.leave_type_name_bn} ({app.leave_type_code})</p>
                <p><span className="text-gray-500">তারিখ:</span> {format(new Date(app.start_date), 'dd MMM')} – {format(new Date(app.end_date), 'dd MMM, yyyy')} ({app.duration_days} দিন)</p>
                {app.reason && <p><span className="text-gray-500">কারণ:</span> {app.reason}</p>}
              </div>
              <button onClick={() => setActionModal(app)}
                className="w-full bg-primary-500 text-white py-2 rounded-xl text-sm font-medium">
                প্রক্রিয়া করুন
              </button>
            </div>
          ))}
        </div>
      )}

      {actionModal && (
        <ActionModal application={actionModal} onClose={() => setActionModal(null)} onSuccess={() => { setActionModal(null); fetchQueue(); }} />
      )}
    </div>
  );
}

function ActionModal({ application, onClose, onSuccess }) {
  const stage = application.status.replace('pending_', '');
  const [note, setNote] = useState('');
  const [modifyStart, setModifyStart] = useState(application.start_date?.split('T')[0] || '');
  const [modifyEnd, setModifyEnd] = useState(application.end_date?.split('T')[0] || '');
  const [showModify, setShowModify] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    setLoading(true);
    try {
      const payload = { action, note };
      if (action === 'modify') {
        payload.modified_start_date = modifyStart;
        payload.modified_end_date = modifyEnd;
      }
      await leaveApi.processApplication(application.id, payload);
      toast.success('প্রক্রিয়া সম্পন্ন হয়েছে ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">{application.employee_name}-এর আবেদন</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>

        <div className="text-sm space-y-1 mb-4 bg-gray-50 rounded-xl p-3">
          <p><span className="text-gray-500">ধরন:</span> {application.leave_type_name_bn}</p>
          <p><span className="text-gray-500">তারিখ:</span> {format(new Date(application.start_date), 'dd MMM')} – {format(new Date(application.end_date), 'dd MMM, yyyy')}</p>
          <p><span className="text-gray-500">সময়কাল:</span> {application.duration_days} দিন</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1.5">মন্তব্য (ঐচ্ছিক)</label>
          <textarea className="input-field resize-none" rows={2} value={note} onChange={e => setNote(e.target.value)} />
        </div>

        {stage === 'check' && (
          <button onClick={() => handleAction('forward')} disabled={loading} className="btn-primary">
            {loading ? 'অপেক্ষা করুন...' : '➡️ Forward করুন'}
          </button>
        )}

        {stage === 'consent' && (
          <div className="space-y-2">
            <button onClick={() => handleAction('forward')} disabled={loading} className="btn-primary">
              {loading ? 'অপেক্ষা করুন...' : '✅ সম্মতি দিয়ে Forward করুন'}
            </button>
            <button onClick={() => handleAction('reject')} disabled={loading}
              className="w-full bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
              ❌ Reject করুন
            </button>
          </div>
        )}

        {stage === 'approval' && (
          <div className="space-y-2">
            <button onClick={() => handleAction('accept')} disabled={loading} className="btn-primary">
              {loading ? 'অপেক্ষা করুন...' : '✅ Accept করুন'}
            </button>

            {!showModify ? (
              <button onClick={() => setShowModify(true)} type="button"
                className="w-full bg-blue-50 text-blue-600 py-2.5 rounded-xl text-sm font-medium">
                ✏️ Modify করে Accept করুন
              </button>
            ) : (
              <div className="space-y-2 bg-blue-50 p-3 rounded-xl">
                <div>
                  <label className="block text-xs font-medium mb-1">নতুন শুরুর তারিখ</label>
                  <input type="date" className="input-field" value={modifyStart} onChange={e => setModifyStart(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">নতুন শেষ তারিখ</label>
                  <input type="date" className="input-field" value={modifyEnd} onChange={e => setModifyEnd(e.target.value)} />
                </div>
                <button onClick={() => handleAction('modify')} disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50">
                  {loading ? 'অপেক্ষা করুন...' : 'পরিবর্তিত তারিখে Accept করুন'}
                </button>
              </div>
            )}

            <button onClick={() => handleAction('reject')} disabled={loading}
              className="w-full bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
              ❌ Reject করুন
            </button>
          </div>
        )}
      </div>
    </div>
  );
}