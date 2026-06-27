import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/client';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogOut } from 'lucide-react';

export default function PortalProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      toast.error('নতুন পাসওয়ার্ড মিলছে না');
      return;
    }
    if (newPass.length < 6) {
      toast.error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(oldPass, newPass);
      toast.success('পাসওয়ার্ড পরিবর্তন হয়েছে ✅');
      setShowPasswordForm(false);
      setOldPass(''); setNewPass(''); setConfirmPass('');
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-dark">আমার প্রোফাইল</h1>

      <div className="card flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
          {user?.avatar_url
            ? <img src={user.avatar_url} alt="avatar" className="w-14 h-14 rounded-full object-cover" />
            : <User size={28} className="text-primary-600" />
          }
        </div>
        <div>
          <p className="font-bold text-dark">{user?.full_name || '—'}</p>
          <p className="text-sm text-gray-500">{user?.phone}</p>
          <p className="text-xs text-gray-400">{user?.designation || user?.role}</p>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold text-sm text-gray-600">তথ্য</h2>
        {[
          { label: 'বিভাগ', value: user?.department },
          { label: 'ইমেইল', value: user?.email },
          { label: 'যোগদানের তারিখ', value: user?.join_date ? new Date(user.join_date).toLocaleDateString('bn-BD') : null },
        ].map(({ label, value }) => value ? (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-dark">{value}</span>
          </div>
        ) : null)}
      </div>

      <button onClick={() => setShowPasswordForm(!showPasswordForm)}
        className="card w-full flex items-center gap-3 text-left">
        <Lock size={18} className="text-primary-600" />
        <span className="font-medium text-sm">পাসওয়ার্ড পরিবর্তন করুন</span>
      </button>

      {showPasswordForm && (
        <form onSubmit={handleChangePassword} className="card space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">পুরনো পাসওয়ার্ড</label>
            <input type="password" className="input-field" value={oldPass}
              onChange={e => setOldPass(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">নতুন পাসওয়ার্ড</label>
            <input type="password" className="input-field" value={newPass}
              onChange={e => setNewPass(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">নতুন পাসওয়ার্ড নিশ্চিত করুন</label>
            <input type="password" className="input-field" value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)} required />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'অপেক্ষা করুন...' : 'পরিবর্তন করুন'}
            </button>
            <button type="button" onClick={() => setShowPasswordForm(false)}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-medium">
              বাতিল
            </button>
          </div>
        </form>
      )}

      <button onClick={handleLogout}
        className="card w-full flex items-center gap-3 text-left text-red-600">
        <LogOut size={18} />
        <span className="font-medium text-sm">লগআউট করুন</span>
      </button>
    </div>
  );
}
