import { useState, useEffect } from 'react';
import { academyApi, accountingApi } from '../../api/client';
import toast from 'react-hot-toast';
import { Settings } from 'lucide-react';

export default function AcademySettings() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ teacher_expense_account_id: '', teacher_payable_account_id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      accountingApi.getAllAccounts(),
      academyApi.getAcademySettings(),
    ]).then(([accR, settR]) => {
      setAccounts(accR.data || []);
      const s = settR.data || {};
      setForm({
        teacher_expense_account_id: s.teacher_expense_account_id || '',
        teacher_payable_account_id: s.teacher_payable_account_id || '',
      });
    }).catch(() => toast.error('লোড করতে সমস্যা')).finally(() => setLoading(false));
  }, []);

  const expenseAccounts = accounts.filter(a => a.account_type === 'expense');
  const liabilityAccounts = accounts.filter(a => a.account_type === 'liability');

  const save = async () => {
    setSaving(true);
    try {
      await academyApi.updateAcademySettings(form);
      toast.success('সংরক্ষিত হয়েছে');
    } catch { toast.error('সমস্যা হয়েছে'); }
    setSaving(false);
  };

  if (loading) return <div className="p-6 text-gray-400">লোড হচ্ছে...</div>;

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Settings size={20} className="text-gray-500" />
        <h1 className="text-xl font-bold text-gray-800">Academy Settings</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5 max-w-xl">
        <div>
          <h2 className="font-semibold text-gray-700 mb-4 text-sm">শিক্ষক পেমেন্ট — একাউন্টিং সেটআপ</h2>
          <p className="text-xs text-gray-400 mb-5">
            এই দুটি account সেট করলে feedback approve হওয়ার সাথে সাথে স্বয়ংক্রিয়ভাবে Accounts Payable entry তৈরি হবে।
            পরিশোধের সময় Teacher Payable account pre-select থাকবে।
          </p>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">
                Teacher Fee Expense Account
                <span className="text-xs text-gray-400 ml-1">(Dr. — Feedback approve হলে)</span>
              </label>
              <select
                className="input-field"
                value={form.teacher_expense_account_id}
                onChange={e => setForm(f => ({ ...f, teacher_expense_account_id: e.target.value }))}
              >
                <option value="">Account বেছে নিন</option>
                {expenseAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} {a.code ? `(${a.code})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-600">
                Accounts Payable — Teacher
                <span className="text-xs text-gray-400 ml-1">(Cr. — দেনা হিসেব)</span>
              </label>
              <select
                className="input-field"
                value={form.teacher_payable_account_id}
                onChange={e => setForm(f => ({ ...f, teacher_payable_account_id: e.target.value }))}
              >
                <option value="">Account বেছে নিন</option>
                {liabilityAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} {a.code ? `(${a.code})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="pt-1 border-t border-gray-100">
          <button onClick={save} disabled={saving}
            className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}
