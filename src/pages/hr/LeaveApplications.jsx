import { useState, useEffect } from 'react';
import { leaveApi } from '../../api/client';
import { format } from 'date-fns';

export default function LeaveApplications() {
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchApplications = () => {
    setLoading(true);
    leaveApi.getAllApplications(statusFilter).then(r => {
      setApplications(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchApplications(); }, [statusFilter]);

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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-dark">Leave Applications</h1>
        <select className="input-field max-w-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">-- সব Status --</option>
          <option value="pending_check">Pending (Check)</option>
          <option value="pending_consent">Pending (Consent)</option>
          <option value="pending_approval">Pending (Approval)</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>
      ) : (
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
                {applications.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">কোনো আবেদন নেই</td></tr>
                ) : applications.map(app => (
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
      )}
    </div>
  );
}