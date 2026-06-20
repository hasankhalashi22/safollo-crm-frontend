import { useState, useEffect } from 'react';
import { leaveApi } from '../../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function LeaveApplications() {
  const [applications, setApplications] = useState([]);
  const [myStages, setMyStages] = useState([]); // which stages (check/consent/approval) the logged-in user can act on
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      leaveApi.getAllApplications(),
      leaveApi.getMyApprovalQueue(),
    ]).then(([allRes, queueRes]) => {
      setApplications(allRes.data || []);
      const queue = queueRes.data || [];
      const stages = [...new Set(queue.map(a => a.status.replace('pending_', '')))];
      setMyStages(stages);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  const stageLabel = (status) => {
    const map = {
      pending_check: 'Pending (Check)',
      pending_consent: 'Pending (Consent)',
      pending_approval: 'Pending (Approval)',
      approved: 'Approved',
      rejected: 'Rejected',
    };
    return map[status] || status;
  };

  const statusColor = (status) => {
    if (status === 'approved') return 'bg-green-50 text-green-600';
    if (status === 'rejected') return 'bg-red-50 text-red-500';
    return 'bg-amber-50 text-amber-600';
  };

  const canActOn = (app) => {
    const stage = app.status.replace('pending_', '');
    return app.status.startsWith('pending_') && myStages.includes(stage);
  };

  const pending = applications.filter(a => a.status.startsWith('pending_'));
  const history = applications.filter(a => !a.status.startsWith('pending_'));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-display font-bold text-dark">Leave Applications</h1>

      {/* Pending — actionable section */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3">অপেক্ষমান আবেদন</h3>
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['কর্মী', 'ধরন', 'শুরু', 'শেষ', 'সময়কাল', 'স্ট্যাটাস', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pending.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">কোনো অপেক্ষমান আবেদন নেই</td></tr>
                ) : pending.map(app => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{app.employee_name}</td>
                    <td className="px-4 py-3">{app.leave_type_name_bn} ({app.leave_type_code})</td>
                    <td className="px-4 py-3 whitespace-nowrap">{format(new Date(app.start_date), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{format(new Date(app.end_date), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3">{app.duration_days} দিন</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(app.status)}`}>{stageLabel(app.status)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {canActOn(app) ? (
                        <button onClick={() => setActionModal(app)}
                          className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-medium">
                          প্রক্রিয়া করুন
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* History — processed applications */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3">প্রক্রিয়াকৃত আবেদন (History)</h3>
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['কর্মী', 'ধরন', 'শুরু', 'শেষ', 'সময়কাল', 'স্ট্যাটাস', 'আবেদনের তারিখ'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">কোনো history নেই</td></tr>
                ) : history.map(app => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{app.employee_name}</td>
                    <td className="px-4 py-3">{app.leave_type_name_bn} ({app.leave_type_code})</td>
                    <td className="px-4 py-3 whitespace-nowrap">{format(new Date(app.start_date), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{format(new Date(app.end_date), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3">{app.modified_duration_days || app.duration_days} দিন</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(app.status)}`}>{stageLabel(app.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{format(new Date(app.created_at), 'dd/MM/yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {actionModal && (
        <ActionModal application={actionModal} onClose={() => setActionModal(null)} onSuccess={() => { setActionModal(null); fetchAll(); }} />
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
          {application.reason && <p><span className="text-gray-500">কারণ:</span> {application.reason}</p>}
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