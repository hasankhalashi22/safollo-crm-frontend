import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Login() {
  const [step, setStep] = useState('phone'); // phone | pin | change-pin
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const redirectByRole = (user) => {
    if (user.role === 'employee') navigate('/portal');
    else if (user.role === 'manager') navigate('/manager');
    else if (user.role_level <= 2) navigate('/admin');
    else navigate('/executive');
  };

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (phone.length !== 11) return toast.error('সঠিক মোবাইল নম্বর দিন');
    setStep('pin');
  };

  const handlePinLogin = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) return toast.error('৪ সংখ্যার PIN দিন');
    setLoading(true);
    try {
      const res = await authApi.loginWithPassword(phone, pin);
      if (!res.user.pin_changed) {
        setLoggedInUser({ token: res.token, user: res.user });
        setStep('change-pin');
        toast('প্রথমবার লগইন — নতুন PIN সেট করুন');
      } else {
        login(res.token, res.user);
        toast.success('স্বাগতম!');
        redirectByRole(res.user);
      }
    } catch (err) {
      toast.error(err.message || 'PIN ভুল');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = async (e) => {
    e.preventDefault();
    if (newPin.length !== 4) return toast.error('৪ সংখ্যার PIN দিন');
    if (newPin !== confirmPin) return toast.error('PIN মিলছে না');
    if (newPin === '0000') return toast.error('0000 PIN ব্যবহার করা যাবে না');
    setLoading(true);
    try {
      localStorage.setItem('crm_token', loggedInUser.token);
      await authApi.changePassword(pin, newPin);
      login(loggedInUser.token, loggedInUser.user);
      toast.success('PIN পরিবর্তন হয়েছে ✅');
      redirectByRole(loggedInUser.user);
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-white blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="bg-white rounded-2xl p-3 inline-block shadow-lg mb-2">
            <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-16 mx-auto" />
          </div>
          <p className="text-primary-200 text-sm mt-1">CRM Management System</p>
        </div>

        <div className="card">
          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-dark mb-1">লগইন করুন</h2>
                <p className="text-gray-500 text-sm">আপনার মোবাইল নম্বর দিন</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1.5">মোবাইল নম্বর</label>
                <input type="tel" className="input-field" placeholder="01XXXXXXXXX"
                  value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} autoFocus />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>পরবর্তী</button>
            </form>
          )}

          {step === 'pin' && (
            <form onSubmit={handlePinLogin} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-dark mb-1">PIN দিন</h2>
                <p className="text-gray-500 text-sm">{phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1.5">৪ সংখ্যার PIN</label>
                <input type="password" inputMode="numeric" className="input-field text-center text-2xl tracking-widest"
                  placeholder="••••" maxLength={4}
                  value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} autoFocus />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <span className="flex items-center justify-center gap-2"><span className="spinner w-5 h-5" />লগইন হচ্ছে...</span> : 'লগইন করুন'}
              </button>
              <button type="button" onClick={() => { setStep('phone'); setPin(''); }}
                className="w-full text-center text-sm text-primary-500 py-2">
                নম্বর পরিবর্তন করুন
              </button>
            </form>
          )}

          {step === 'change-pin' && (
            <form onSubmit={handleChangePin} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-dark mb-1">নতুন PIN সেট করুন</h2>
                <p className="text-gray-500 text-sm">নিরাপত্তার জন্য ডিফল্ট PIN পরিবর্তন করুন</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">নতুন PIN</label>
                <input type="password" inputMode="numeric" className="input-field text-center text-2xl tracking-widest"
                  placeholder="••••" maxLength={4}
                  value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">PIN নিশ্চিত করুন</label>
                <input type="password" inputMode="numeric" className="input-field text-center text-2xl tracking-widest"
                  placeholder="••••" maxLength={4}
                  value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'সেট হচ্ছে...' : 'PIN সেট করে এগিয়ে যান'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-primary-200 text-xs mt-6">সাফল্য একাডেমি © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
