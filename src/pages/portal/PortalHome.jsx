import { useState, useEffect } from 'react';
import { attendanceApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function PortalHome() {
  const { user } = useAuth();
  const [todayStatus, setTodayStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchToday = () => {
    attendanceApi.getMyToday().then(r => {
      setTodayStatus(r.data || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchToday(); }, []);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await attendanceApi.checkIn();
      toast.success('Check-in সফল হয়েছে ✅');
      fetchToday();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await attendanceApi.checkOut();
      toast.success('Check-out সফল হয়েছে ✅');
      fetchToday();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setActionLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-2xl p-5">
        <p className="text-primary-200 text-sm">স্বাগতম</p>
        <h2 className="text-xl font-bold">{user?.full_name || user?.phone}</h2>
        <p className="text-primary-200 text-xs mt-1">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Clock size={18} /> আজকের Attendance
        </h3>

        {todayStatus?.check_in_time ? (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Check-in</span>
              <span className="font-medium">{format(new Date(todayStatus.check_in_time), 'hh:mm a')}</span>
            </div>
            {todayStatus.is_late && (
              <p className="text-xs text-red-500">{todayStatus.late_by_minutes} মিনিট দেরি হয়েছে</p>
            )}
            {todayStatus.check_out_time && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Check-out</span>
                <span className="font-medium">{format(new Date(todayStatus.check_out_time), 'hh:mm a')}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm mb-4">আজকে এখনো check-in করা হয়নি</p>
        )}

        {!todayStatus?.check_in_time ? (
          <button onClick={handleCheckIn} disabled={actionLoading} className="btn-primary">
            {actionLoading ? 'অপেক্ষা করুন...' : '✅ Check-in করুন'}
          </button>
        ) : !todayStatus?.check_out_time ? (
          <button onClick={handleCheckOut} disabled={actionLoading}
            className="w-full bg-amber-500 text-white py-3 rounded-xl font-medium disabled:opacity-50">
            {actionLoading ? 'অপেক্ষা করুন...' : '🚪 Check-out করুন'}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-green-600 py-2">
            <CheckCircle size={18} /> <span className="font-medium text-sm">আজকের attendance সম্পন্ন</span>
          </div>
        )}
      </div>
    </div>
  );
}