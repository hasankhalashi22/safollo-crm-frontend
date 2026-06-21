import { useState, useEffect } from 'react';
import { attendanceApi, hrApi } from '../../api/client';
import toast from 'react-hot-toast';

export default function AttendanceSettings() {
  const [policy, setPolicy] = useState(null);
  const [breakTypes, setBreakTypes] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [policyForm, setPolicyForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchAll = () => {
    Promise.all([
      attendanceApi.getPolicy(),
      attendanceApi.getBreakTypes(),
      hrApi.getPositions(),
    ]).then(([policyRes, breaksRes, posRes]) => {
      setPolicy(policyRes.data || null);
      setPolicyForm(policyRes.data || {});
      setBreakTypes(breaksRes.data || []);
      setPositions(posRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const set = (k, v) => setPolicyForm(p => ({ ...p, [k]: v }));

  const handleSavePolicy = async () => {
    setSaving(true);
    try {
      await attendanceApi.updatePolicy(policyForm);
      toast.success('Policy সংরক্ষিত হয়েছে ✅');
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setSaving(false); }
  };

  const handleBreakDurationChange = async (id, duration) => {
    try {
      await attendanceApi.updateBreakType(id, { duration_minutes: duration });
      toast.success('Break সময় আপডেট হয়েছে ✅');
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-display font-bold text-dark">Attendance Settings</h1>

      {/* Break Types */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-4">বিরতির ধরন (Break Types)</h3>
        <div className="space-y-3">
          {breakTypes.map(bt => (
            <div key={bt.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <span className="text-sm font-medium">{bt.name_bn}</span>
              <div className="flex items-center gap-2">
                <input type="number" defaultValue={bt.duration_minutes} className="input-field max-w-[80px] text-center"
                  onBlur={e => handleBreakDurationChange(bt.id, e.target.value)} />
                <span className="text-xs text-gray-400">মিনিট</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grace & Penalty */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-700">দেরি ও জরিমানা নীতি</h3>

        <div>
          <label className="block text-sm font-medium mb-1.5">দৈনিক Grace সময় (মিনিট)</label>
          <input type="number" className="input-field max-w-[120px]" value={policyForm.grace_minutes || ''}
            onChange={e => set('grace_minutes', e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">এই সময়ের মধ্যে দেরি/আগে চলে যাওয়ায় কোনো জরিমানা হবে না</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">প্রতি মিনিট জরিমানার গুণিতক (Grace-এর পরে)</label>
          <input type="number" step="0.1" className="input-field max-w-[120px]" value={policyForm.penalty_multiplier || ''}
            onChange={e => set('penalty_multiplier', e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Extended Threshold (মিনিট)</label>
          <input type="number" className="input-field max-w-[120px]" value={policyForm.extended_threshold_minutes || ''}
            onChange={e => set('extended_threshold_minutes', e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">এর বেশি সময় দেরি হলে বর্ধিত জরিমানা প্রযোজ্য হবে</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">বর্ধিত প্রতি মিনিট জরিমানার গুণিতক</label>
          <input type="number" step="0.1" className="input-field max-w-[120px]" value={policyForm.extended_penalty_multiplier || ''}
            onChange={e => set('extended_penalty_multiplier', e.target.value)} />
        </div>
      </div>

      {/* Pattern penalties */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-700">প্যাটার্নভিত্তিক নীতি</h3>

        <div>
          <label className="block text-sm font-medium mb-1.5">টানা দেরির পর ১ দিন Absent ধরা হবে (দিন সংখ্যা)</label>
          <input type="number" className="input-field max-w-[120px]" value={policyForm.consecutive_late_days_for_absent || ''}
            onChange={e => set('consecutive_late_days_for_absent', e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">মাসিক Late থ্রেশহোল্ড (দিন সংখ্যা)</label>
          <input type="number" className="input-field max-w-[120px]" value={policyForm.monthly_late_threshold_days || ''}
            onChange={e => set('monthly_late_threshold_days', e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">মাসে এর বেশি দিন late হলে, প্রতিটার জন্য আলাদা কর্তন হবে</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">থ্রেশহোল্ড পার হলে প্রতি দিনের কর্তন (দিনে)</label>
          <input type="number" step="0.1" className="input-field max-w-[120px]" value={policyForm.monthly_late_deduction_days || ''}
            onChange={e => set('monthly_late_deduction_days', e.target.value)} />
        </div>
      </div>

      {/* Waiver authority */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3">Waiver অনুমোদনকারী Position</h3>
        <select className="input-field" value={policyForm.waiver_position_id || ''}
          onChange={e => set('waiver_position_id', e.target.value)}>
          <option value="">-- Position বেছে নিন --</option>
          {positions.map(p => <option key={p.id} value={p.id}>{p.title}{p.department ? ` — ${p.department}` : ''}</option>)}
        </select>
        <p className="text-xs text-gray-400 mt-1">এই position-এ থাকা কর্মী waiver আবেদন অনুমোদন/বাতিল করতে পারবে</p>
      </div>

      <button onClick={handleSavePolicy} className="btn-primary max-w-xs" disabled={saving}>
        {saving ? 'Saving...' : '✅ Policy সংরক্ষণ করুন'}
      </button>
    </div>
  );
}