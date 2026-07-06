import { useState, useEffect } from 'react';
import { attendanceApi } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { Clock, CheckCircle, Coffee } from 'lucide-react';
import { format } from 'date-fns';

export default function PortalHome() {
  const { user } = useAuth();
  const [todayStatus, setTodayStatus] = useState(null);
  const [breakTypes, setBreakTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAll = () => {
    Promise.all([
      attendanceApi.getMyToday(),
      attendanceApi.getBreakTypes(),
    ]).then(([todayRes, breaksRes]) => {
      setTodayStatus(todayRes.data || null);
      setBreakTypes(breaksRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const verifyLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('আপনার ডিভাইসে GPS সমর্থিত নয়'));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const OFFICE_LAT = 23.8136438979753;
        const OFFICE_LNG = 90.36224638800711;
        const RADIUS_METERS = 100;
        const toRad = (v) => (v * Math.PI) / 180;
        const R = 6371000;
        const dLat = toRad(pos.coords.latitude - OFFICE_LAT);
        const dLng = toRad(pos.coords.longitude - OFFICE_LNG);
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(OFFICE_LAT)) * Math.cos(toRad(pos.coords.latitude)) * Math.sin(dLng / 2) ** 2;
        const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (distance <= RADIUS_METERS) resolve();
        else reject(new Error('আপনি এখন সাফল্য একাডেমিতে অবস্থান করছেন না'));
      },
      () => reject(new Error('Location permission দিন এবং GPS চালু করুন')),
      { timeout: 10000, enableHighAccuracy: true }
    );
  });

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await verifyLocation();
      await attendanceApi.checkIn();
      toast.success('Check-in সফল হয়েছে ✅');
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setActionLoading(false); }
  };

  const handleBreakOut = async (breakTypeId) => {
    setActionLoading(true);
    try {
      await attendanceApi.breakOut(breakTypeId);
      toast.success('Break শুরু হয়েছে ✅');
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setActionLoading(false); }
  };

  const handleBreakIn = async (breakId) => {
    setActionLoading(true);
    try {
      await attendanceApi.breakIn(breakId);
      toast.success('Break শেষ হয়েছে ✅');
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await verifyLocation();
      await attendanceApi.checkOut();
      toast.success('Check-out সফল হয়েছে ✅');
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'সমস্যা হয়েছে');
    } finally { setActionLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  const openBreak = todayStatus?.breaks?.find(b => b.break_out_time && !b.break_in_time);
  const usedBreakTypeIds = (todayStatus?.breaks || []).map(b => b.break_type_id);

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
          <div className="space-y-1.5 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Check-in</span>
              <span className="font-medium">{format(new Date(todayStatus.check_in_time), 'hh:mm a')}</span>
            </div>
            {todayStatus.check_out_time && (
              <div className="flex justify-between">
                <span className="text-gray-500">Check-out</span>
                <span className="font-medium">{format(new Date(todayStatus.check_out_time), 'hh:mm a')}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm mb-4">আজকে এখনো check-in করা হয়নি</p>
        )}

        {!todayStatus?.check_in_time && (
          <button onClick={handleCheckIn} disabled={actionLoading} className="btn-primary">
            {actionLoading ? 'অপেক্ষা করুন...' : '✅ Check-in করুন'}
          </button>
        )}

        {todayStatus?.check_in_time && !todayStatus?.check_out_time && (
          <div className="space-y-3">
            {/* Break section */}
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                <Coffee size={14} /> বিরতি (Break)
              </p>

              {openBreak ? (
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    {breakTypes.find(bt => bt.id === openBreak.break_type_id)?.name_bn} চলছে —
                    শুরু: {format(new Date(openBreak.break_out_time), 'hh:mm a')}
                  </p>
                  <button onClick={() => handleBreakIn(openBreak.id)} disabled={actionLoading}
                    className="w-full bg-amber-500 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50">
                    {actionLoading ? 'অপেক্ষা করুন...' : 'Break শেষ করুন (ফিরে আসুন)'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {breakTypes.map(bt => (
                    <button key={bt.id} onClick={() => handleBreakOut(bt.id)} disabled={actionLoading}
                      className="bg-white border border-amber-200 text-amber-700 py-2 rounded-xl text-xs font-medium disabled:opacity-50">
                      {bt.name_bn} ({bt.duration_minutes} মিনিট)
                    </button>
                  ))}
                </div>
              )}

              {todayStatus?.breaks?.filter(b => b.break_in_time).length > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-100 space-y-1">
                  {todayStatus.breaks.filter(b => b.break_in_time).map(b => (
                    <p key={b.id} className="text-[11px] text-gray-500">
                      {breakTypes.find(bt => bt.id === b.break_type_id)?.name_bn}: {b.duration_minutes} মিনিট
                      {b.excess_minutes > 0 && <span className="text-red-500"> (+{b.excess_minutes} অতিরিক্ত)</span>}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {!openBreak && (
              <button onClick={handleCheckOut} disabled={actionLoading}
                className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium disabled:opacity-50">
                {actionLoading ? 'অপেক্ষা করুন...' : '🚪 Check-out করুন'}
              </button>
            )}
          </div>
        )}

        {todayStatus?.check_in_time && todayStatus?.check_out_time && (
          <div className="flex items-center justify-center gap-2 text-green-600 py-2">
            <CheckCircle size={18} /> <span className="font-medium text-sm">আজকের attendance সম্পন্ন</span>
          </div>
        )}
      </div>
    </div>
  );
}