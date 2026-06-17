import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Login() {
  const [step, setStep] = useState('phone'); // phone | password | otp | first-otp | set-password | force-change-password
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const SUPER_ADMIN_PHONE = '01518916372'; // Super Admin phone

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (phone.length !== 11) return toast.error('সঠিক মোবাইল নম্বর দিন');

    // Super Admin always uses OTP
    if (phone === SUPER_ADMIN_PHONE) {
      setLoading(true);
      try {
        await authApi.sendOtp(phone);
        toast.success('OTP পাঠানো হয়েছে');
        setStep('otp');
      } catch (err) {
        toast.error(err.message || 'সমস্যা হয়েছে');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Others go to password step
    setStep('password');
  };

const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!password) {
      // No password entered — try first login flow (legacy OTP path, for accounts without a password set)
      setLoading(true);
      try {
        await authApi.sendOtp(phone);
        toast.success('প্রথমবার লগইন — OTP পাঠানো হয়েছে');
        setStep('first-otp');
      } catch (err) {
        toast.error(err.message || 'সমস্যা হয়েছে');
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.loginWithPassword(phone, password);
     if (res.user.is_first_login) {
        // Logged in with default password — force them to set a new one
        toast.info('প্রথমবার লগইন — নতুন পাসওয়ার্ড সেট করুন');
        login(res.token, res.user);
        setLoggedInUser(res.user);
        setStep('force-change-password');
        return;
      }
      login(res.token, res.user);
      toast.success(`স্বাগতম!`);
      redirectByRole(res.user);
    } catch (err) {
      if (err.is_first_login || err.statusCode === 428) {
        // Account has no password at all yet — legacy OTP path
        toast.info('প্রথমবার লগইন — OTP দিয়ে verify করুন');
        setIsFirstLogin(true);
        await sendFirstOtp();
      } else {
        toast.error(err.message || 'পাসওয়ার্ড ভুল');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendFirstOtp = async () => {
    setLoading(true);
    try {
      await authApi.sendOtp(phone);
      toast.success('OTP পাঠানো হয়েছে');
      setStep('first-otp');
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleFirstOtpVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('৬ সংখ্যার OTP দিন');
    setLoading(true);
    try {
      await authApi.verifyOtpFirst(phone, otp);
      toast.success('OTP verified! এখন পাসওয়ার্ড সেট করুন');
      setStep('set-password');
    } catch (err) {
      toast.error(err.message || 'OTP ভুল');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length !== 4) return toast.error('৪ সংখ্যার পাসওয়ার্ড দিন');
    if (newPassword !== confirmPassword) return toast.error('পাসওয়ার্ড মিলছে না');
    setLoading(true);
    try {
      await authApi.setPassword(phone, newPassword);
      toast.success('পাসওয়ার্ড সেট হয়েছে! এখন লগইন করুন');
      setStep('password');
      setPassword('');
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

const handleForceChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length !== 4) return toast.error('৪ সংখ্যার পাসওয়ার্ড দিন');
    if (newPassword !== confirmPassword) return toast.error('পাসওয়ার্ড মিলছে না');
    if (newPassword === '1234') return toast.error('ডিফল্ট পাসওয়ার্ড ব্যবহার করা যাবে না, নতুন পাসওয়ার্ড দিন');
    setLoading(true);
    try {
      await authApi.changePassword('1234', newPassword);
      toast.success('পাসওয়ার্ড পরিবর্তন হয়েছে ✅');
      redirectByRole(loggedInUser);
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('৬ সংখ্যার OTP দিন');
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(phone, otp);
      login(res.token, res.user);
      toast.success(`স্বাগতম!`);
      redirectByRole(res.user);
    } catch (err) {
      toast.error(err.message || 'OTP ভুল');
    } finally {
      setLoading(false);
    }
  };

  const redirectByRole = (user) => {
    if (user.role === 'manager') navigate('/manager');
    else if (user.role_level <= 2) navigate('/admin');
    else navigate('/executive');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-white blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="mb-4">
  <div className="bg-white rounded-2xl p-3 inline-block shadow-lg mb-2">
  <img src="/logo.png" alt="সাফল্য একাডেমি" className="h-16 mx-auto" />
</div>
</div>
<p className="text-primary-200 text-sm mt-1">CRM Management System</p>
        </div>

        <div className="card">
          {/* Step 1: Phone */}
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
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <span className="flex items-center justify-center gap-2"><span className="spinner w-5 h-5" /> অপেক্ষা করুন...</span> : 'পরবর্তী'}
              </button>
            </form>
          )}

          {/* Step 2: Password */}
          {step === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-dark mb-1">পাসওয়ার্ড দিন</h2>
                <p className="text-gray-500 text-sm">{phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1.5">৪ সংখ্যার পাসওয়ার্ড</label>
                <input type="number" className="input-field text-center text-2xl tracking-widest"
                  placeholder="••••" maxLength={4}
                  value={password} onChange={e => setPassword(e.target.value.slice(0, 4))} autoFocus />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <span className="flex items-center justify-center gap-2"><span className="spinner w-5 h-5" /> লগইন হচ্ছে...</span> : 'লগইন করুন'}
              </button>
              <button type="button" onClick={() => { setStep('phone'); setPassword(''); }}
                className="w-full text-center text-sm text-primary-500 py-2">
                নম্বর পরিবর্তন করুন
              </button>
            </form>
          )}

          {/* Step 3: OTP (Super Admin) */}
          {step === 'otp' && (
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-dark mb-1">OTP যাচাই</h2>
                <p className="text-gray-500 text-sm">{phone} নম্বরে পাঠানো ৬ সংখ্যার কোড</p>
              </div>
              <input type="number" className="input-field text-center text-2xl tracking-widest"
                placeholder="000000" value={otp} onChange={e => setOtp(e.target.value.slice(0, 6))} autoFocus />
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'যাচাই হচ্ছে...' : 'লগইন করুন'}
              </button>
              <button type="button" onClick={() => { setStep('phone'); setOtp(''); }}
                className="w-full text-center text-sm text-primary-500 py-2">নম্বর পরিবর্তন করুন</button>
            </form>
          )}

          {/* Step 4: First time OTP */}
          {step === 'first-otp' && (
            <form onSubmit={handleFirstOtpVerify} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-dark mb-1">প্রথমবার লগইন</h2>
                <p className="text-gray-500 text-sm">{phone} নম্বরে OTP পাঠানো হয়েছে</p>
              </div>
              <input type="number" className="input-field text-center text-2xl tracking-widest"
                placeholder="000000" value={otp} onChange={e => setOtp(e.target.value.slice(0, 6))} autoFocus />
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'যাচাই হচ্ছে...' : 'OTP যাচাই করুন'}
              </button>
            </form>
          )}

         {/* Force change password (default password login) */}
          {step === 'force-change-password' && (
            <form onSubmit={handleForceChangePassword} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-dark mb-1">নতুন পাসওয়ার্ড সেট করুন</h2>
                <p className="text-gray-500 text-sm">আপনার নিরাপত্তার জন্য একটি নতুন ৪ সংখ্যার পাসওয়ার্ড দিন</p>
              </div>
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
          )}

          {/* Step 5: Set Password */}
          {step === 'set-password' && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-dark mb-1">পাসওয়ার্ড সেট করুন</h2>
                <p className="text-gray-500 text-sm">৪ সংখ্যার পাসওয়ার্ড দিন</p>
              </div>
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
                {loading ? 'সেট হচ্ছে...' : 'পাসওয়ার্ড সেট করুন'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-primary-200 text-xs mt-6">সাফল্য একাডেমি © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}