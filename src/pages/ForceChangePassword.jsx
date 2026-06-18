import { useState } from 'react';
import { authApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function ForceChangePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
 const { user, login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length !== 4) return toast.error('৪ সংখ্যার পাসওয়ার্ড দিন');
    if (newPassword !== confirmPassword) return toast.error('পাসওয়ার্ড মিলছে না');
    if (newPassword === '1234') return toast.error('ডিফল্ট পাসওয়ার্ড ব্যবহার করা যাবে না, নতুন পাসওয়ার্ড দিন');
    setLoading(true);
    try {
      await authApi.changePassword('1234', newPassword);
      toast.success('পাসওয়ার্ড পরিবর্তন হয়েছে ✅');
      // Update local user state so ProtectedRoute stops redirecting here
     const token = localStorage.getItem('crm_token');
      login(token, { ...user, is_first_login: false });
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-dark mb-1">নতুন পাসওয়ার্ড সেট করুন</h2>
            <p className="text-gray-500 text-sm">আপনার নিরাপত্তার জন্য একটি নতুন ৪ সংখ্যার পাসওয়ার্ড দিন</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">নতুন পাসওয়ার্ড</label>
              <input type="number" className="input-field text-center text-2xl tracking-widest"
                placeholder="••••" value={newPassword} onChange={e => setNewPassword(e.target.value.slice(0, 4))} autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">পাসওয়ার্ড নিশ্চিত করুন</label>
              <input type="number" className="input-field text-center text-2xl tracking-widest"
                placeholder="••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value.slice(0, 4))} />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'সেট হচ্ছে...' : 'পাসওয়ার্ড সেট করে এগিয়ে যান'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}