import { useState, useEffect } from 'react';
import { leaveApi, hrApi } from '../../api/client';
import { Trash2, Plus, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

export default function LeaveSettings() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const hrRole = user?.module_access?.find(a => a.module_key === 'hr')?.role_key;
  const canDelete = isSuperAdmin || user?.role === 'advisor' || hrRole === 'hr_advisor';
  const [types, setTypes] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [positions, setPositions] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState({ date: '', name: '', name_bn: '' });
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editType, setEditType] = useState(null);
  const [addTypeModal, setAddTypeModal] = useState(false);

 const fetchAll = () => {
    setLoading(true);
    Promise.all([
      leaveApi.getTypes(),
      leaveApi.getPolicy(),
      hrApi.getPositions(),
      hrApi.getHolidays(),
    ]).then(([typesRes, policyRes, posRes, holidaysRes]) => {
      setTypes(typesRes.data || []);
      setPolicy(policyRes.data || null);
      setPositions(posRes.data || []);
      setHolidays(holidaysRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const handleDeleteType = async (t) => {
    if (!confirm(`"${t.name_bn || t.name}" মুছে ফেলবেন?`)) return;
    try {
      await leaveApi.deleteType(t.id);
      toast.success('মুছে ফেলা হয়েছে');
      fetchAll();
    } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
  };

  useEffect(() => { fetchAll(); }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-display font-bold text-dark">Leave Settings</h1>

      {/* Leave Types */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700">ছুটির ধরন</h3>
          <button onClick={() => setAddTypeModal(true)}
            className="flex items-center gap-1.5 bg-primary-500 text-white px-3 py-1.5 rounded-xl text-sm font-medium">
            <Plus size={14} /> নতুন ধরন
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
               {['নাম', 'Code', 'বার্ষিক কোটা', 'Eligibility', 'Paid?', 'প্রযোজ্য', 'Action'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {types.map(t => (
                <tr key={t.id}>
                  <td className="px-3 py-2">{t.name_bn} <span className="text-gray-400">({t.name})</span></td>
                  <td className="px-3 py-2">{t.code}</td>
                  <td className="px-3 py-2">{t.annual_quota_days} দিন</td>
                  <td className="px-3 py-2">{t.eligibility_months > 0 ? `${t.eligibility_months} মাস পর` : 'তাৎক্ষণিক'}</td>
                  <td className="px-3 py-2">{t.is_paid ? '✅ Paid' : '❌ Unpaid'}</td>
                  <td className="px-3 py-2">{t.applicable_to === 'full_time' ? 'Full Time' : 'সবার জন্য'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setEditType(t)} className="px-2 py-1 bg-primary-50 text-primary-600 rounded-lg text-xs">
                        <Edit2 size={14} />
                      </button>
                      {canDelete && (
                        <button onClick={() => handleDeleteType(t)} className="px-2 py-1 bg-red-50 text-red-500 rounded-lg text-xs">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Policy */}
      {policy && (
        <PolicyEditor policy={policy} positions={positions} onUpdate={fetchAll} />
      )}

      {addTypeModal && (
        <LeaveTypeModal onClose={() => setAddTypeModal(false)} onSuccess={() => { setAddTypeModal(false); fetchAll(); }} />
      )}

{/* Office & Govt Holidays */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-4">অফিস ও সরকারি ছুটি</h3>

        {/* Add holiday form */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-gray-600 mb-3">নতুন ছুটি যুক্ত করুন</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5">তারিখ *</label>
              <input type="date" className="input-field" value={holidayForm.date}
                onChange={e => setHolidayForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">নাম (বাংলা) *</label>
              <input type="text" className="input-field" value={holidayForm.name_bn}
                onChange={e => setHolidayForm(p => ({ ...p, name_bn: e.target.value }))}
                placeholder="যেমন: ঈদুল ফিতর" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Name (English)</label>
              <input type="text" className="input-field" value={holidayForm.name}
                onChange={e => setHolidayForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Eid ul-Fitr" />
            </div>
            <div className="flex items-end">
              <button onClick={async () => {
                if (!holidayForm.date || !holidayForm.name_bn) return toast.error('তারিখ ও নাম দিন');
                setAddingHoliday(true);
                try {
                  await hrApi.createHoliday({ ...holidayForm, name: holidayForm.name || holidayForm.name_bn });
                  toast.success('ছুটি যুক্ত হয়েছে ✅');
                  setHolidayForm({ date: '', name: '', name_bn: '' });
                  fetchAll();
                } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
                finally { setAddingHoliday(false); }
              }} disabled={addingHoliday}
                className="flex items-center gap-1.5 bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium w-full justify-center disabled:opacity-50">
                <Plus size={14} /> {addingHoliday ? 'যুক্ত হচ্ছে...' : 'যুক্ত করুন'}
              </button>
            </div>
          </div>
        </div>

        {/* Holiday list */}
        {holidays.length === 0 ? (
          <p className="text-center py-6 text-gray-400 text-sm">কোনো ছুটি নেই</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['তারিখ', 'নাম (বাংলা)', 'Name (English)', 'Action'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {holidays.map(h => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(h.date).toLocaleDateString('bn-BD')}</td>
                    <td className="px-3 py-2">{h.name_bn || h.name}</td>
                    <td className="px-3 py-2 text-gray-500">{h.name}</td>
                    <td className="px-3 py-2">
                      <button onClick={async () => {
                        if (!confirm('এই ছুটি মুছে ফেলতে চান?')) return;
                        try {
                          await hrApi.deleteHoliday(h.id);
                          toast.success('মুছে ফেলা হয়েছে');
                          fetchAll();
                        } catch (err) { toast.error(err.message || 'সমস্যা হয়েছে'); }
                      }} className="p-1.5 bg-red-50 text-red-500 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editType && (
        <LeaveTypeModal leaveType={editType} onClose={() => setEditType(null)} onSuccess={() => { setEditType(null); fetchAll(); }} />
      )}
    </div>
  );
}

function PolicyEditor({ policy, positions, onUpdate }) {
  const [halfDayHours, setHalfDayHours] = useState(policy.half_day_max_hours || 4);
  const [checkPos, setCheckPos] = useState(policy.check_position_id || '');
  const [consentPos, setConsentPos] = useState(policy.consent_position_id || '');
  const [approvalPos, setApprovalPos] = useState(policy.approval_position_id || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await leaveApi.updatePolicy({
        half_day_max_hours: halfDayHours,
        check_position_id: checkPos || null,
        consent_position_id: consentPos || null,
        approval_position_id: approvalPos || null,
      });
      toast.success('Policy আপডেট হয়েছে ✅');
      onUpdate();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-700 mb-4">Approval Policy</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Half-day সর্বোচ্চ ঘণ্টা (এর কম হলে অর্ধ দিবস ধরা হবে)</label>
          <input type="number" step="0.5" className="input-field max-w-xs" value={halfDayHours}
            onChange={e => setHalfDayHours(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Check (প্রথম ধাপ)</label>
            <select className="input-field" value={checkPos} onChange={e => setCheckPos(e.target.value)}>
              <option value="">-- Position বেছে নিন --</option>
             {positions.map(p => <option key={p.id} value={p.id}>{p.title}{p.department ? ` — ${p.department}` : ''}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">শুধু Forward করতে পারবে</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Consent (পূর্ণ দিবসের জন্য)</label>
            <select className="input-field" value={consentPos} onChange={e => setConsentPos(e.target.value)}>
              <option value="">-- Position বেছে নিন --</option>
              {positions.map(p => <option key={p.id} value={p.id}>{p.title}{p.department ? ` — ${p.department}` : ''}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Reject বা Forward করতে পারবে</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Approval (চূড়ান্ত)</label>
            <select className="input-field" value={approvalPos} onChange={e => setApprovalPos(e.target.value)}>
              <option value="">-- Position বেছে নিন --</option>
             {positions.map(p => <option key={p.id} value={p.id}>{p.title}{p.department ? ` — ${p.department}` : ''}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Accept/Reject/Modify করতে পারবে</p>
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-xl text-xs text-blue-700">
          <p className="font-medium mb-1">নীতি:</p>
          <p>• অর্ধ দিবসের কম ছুটি: Check → Approval</p>
          <p>• পূর্ণ দিবস বা তার বেশি: Check → Consent → Approval</p>
        </div>

        <button onClick={handleSave} className="btn-primary max-w-xs" disabled={loading}>
          {loading ? 'Saving...' : '✅ Policy সংরক্ষণ করুন'}
        </button>
      </div>
    </div>
  );
}

function LeaveTypeModal({ leaveType, onClose, onSuccess }) {
  const isEdit = !!leaveType;
 const [form, setForm] = useState({
    name: leaveType?.name || '',
    name_bn: leaveType?.name_bn || '',
    code: leaveType?.code || '',
    annual_quota_days: leaveType?.annual_quota_days || 0,
    is_paid: leaveType?.is_paid !== false,
    applicable_to: leaveType?.applicable_to || 'full_time',
    is_active: leaveType?.is_active !== false,
    eligibility_months: leaveType?.eligibility_months || 0,
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name_bn || !form.code) return toast.error('নাম ও কোড দিন');
    setLoading(true);
    try {
      if (isEdit) {
        await leaveApi.updateType(leaveType.id, form);
      } else {
        await leaveApi.createType(form);
      }
      toast.success('সংরক্ষিত হয়েছে ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">{isEdit ? 'Edit Leave Type' : 'নতুন Leave Type'}</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">নাম (বাংলা) *</label>
            <input type="text" className="input-field" value={form.name_bn} onChange={e => set('name_bn', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Name (English)</label>
            <input type="text" className="input-field" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Code *</label>
            <input type="text" className="input-field" value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} disabled={isEdit} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Eligibility (সর্বনিম্ন কর্মকাল, মাসে)</label>
            <input type="number" className="input-field" value={form.eligibility_months}
              onChange={e => set('eligibility_months', e.target.value)} placeholder="e.g. 3" />
            <p className="text-xs text-gray-400 mt-1">জয়েনিং তারিখ থেকে এই কয়েক মাস পার হলেই কর্মী এই ছুটির জন্য যোগ্য হবে (০ = সবসময় যোগ্য)</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_paid} onChange={e => set('is_paid', e.target.checked)} />
            <label className="text-sm">Paid Leave</label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">প্রযোজ্য কাদের জন্য</label>
            <select className="input-field" value={form.applicable_to} onChange={e => set('applicable_to', e.target.value)}>
              <option value="full_time">শুধু Full Time</option>
              <option value="all">সবার জন্য</option>
            </select>
          </div>
          {isEdit && (
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
              <label className="text-sm">সক্রিয়</label>
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : '✅ Save'}
          </button>
        </form>
      </div>
    </div>
  );
}