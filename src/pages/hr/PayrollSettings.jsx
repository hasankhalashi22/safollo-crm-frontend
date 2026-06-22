import { useState, useEffect } from 'react';
import { payrollApi, accountingApi } from '../../api/client';
import toast from 'react-hot-toast';

export default function PayrollSettings() {
  const [settings, setSettings] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    Promise.all([
      payrollApi.getSettings(),
     accountingApi.getAllAccounts(),
    ]).then(([settingsRes, accountsRes]) => {
      setSettings(settingsRes.data || null);
      setForm(settingsRes.data || {});
      setAccounts(accountsRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await payrollApi.updateSettings(form);
      toast.success('Settings সংরক্ষিত হয়েছে ✅');
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">Payroll Settings</h1>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Salary Close Day (মাসের কত তারিখে Close হবে)</label>
          <input type="number" min="1" max="31" className="input-field max-w-[100px]" value={form.close_day || ''}
            onChange={e => set('close_day', e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Salary Expense Account</label>
          <select className="input-field" value={form.salary_expense_account_id || ''}
            onChange={e => set('salary_expense_account_id', e.target.value)}>
            <option value="">-- বেছে নিন --</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Payment Account (যেখান থেকে টাকা দেওয়া হবে)</label>
          <select className="input-field" value={form.payment_account_id || ''}
            onChange={e => set('payment_account_id', e.target.value)}>
            <option value="">-- বেছে নিন --</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Salary Payable Account (Close-এর সময় বাকি টাকার জন্য liability)</label>
          <select className="input-field" value={form.salary_payable_account_id || ''}
            onChange={e => set('salary_payable_account_id', e.target.value)}>
            <option value="">-- বেছে নিন --</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <button onClick={handleSave} className="btn-primary max-w-xs" disabled={saving}>
          {saving ? 'Saving...' : '✅ সংরক্ষণ করুন'}
        </button>
      </div>
    </div>
  );
}