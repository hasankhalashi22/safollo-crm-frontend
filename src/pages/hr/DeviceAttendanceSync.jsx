import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { attendanceApi } from '../../api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function Modal({ children }) {
  return createPortal(children, document.body);
}

function RegisterDeviceModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ serial_number: '', name: '', location: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.serial_number.trim()) return toast.error('Serial Number দিন');
    setSaving(true);
    try {
      await attendanceApi.registerDevice(form);
      toast.success('Device নিবন্ধন করা হয়েছে ✅');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'সমস্যা হয়েছে');
    } finally { setSaving(false); }
  };

  return (
    <Modal>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-5">
          <div className="flex justify-between mb-4">
            <h3 className="font-bold text-lg">নতুন Device নিবন্ধন করুন</h3>
            <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Serial Number (SN)</label>
              <input className="input-field" value={form.serial_number}
                onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
                placeholder="ডিভাইসের System Info থেকে দেখুন" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">নাম (ঐচ্ছিক)</label>
              <input className="input-field" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="যেমন: K50a Main Gate" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">অবস্থান (ঐচ্ছিক)</label>
              <input className="input-field" value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="যেমন: মূল ফটক" />
            </div>
          </div>
          <button onClick={handleSubmit} className="btn-primary w-full mt-4" disabled={saving}>
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'নিবন্ধন করুন'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function DeviceAttendanceSync() {
  const [devices, setDevices] = useState([]);
  const [unmapped, setUnmapped] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [punches, setPunches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [pendingAssign, setPendingAssign] = useState({}); // { [pin]: employeeId }

  const fetchAll = () => {
    Promise.all([
      attendanceApi.getDevices(),
      attendanceApi.getUnmappedPunches(),
      attendanceApi.getDeviceMappings(),
      attendanceApi.getRecentPunches({ limit: 50 }),
    ]).then(([devicesRes, unmappedRes, mappingsRes, punchesRes]) => {
      setDevices(devicesRes.data || []);
      setUnmapped(unmappedRes.data || []);
      setEmployees(mappingsRes.data || []);
      setPunches(punchesRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAssign = async (devicePin) => {
    const employeeId = pendingAssign[devicePin];
    if (!employeeId) return toast.error('আগে কর্মী বেছে নিন');
    try {
      await attendanceApi.assignDeviceMapping(employeeId, devicePin);
      toast.success('PIN assign করা হয়েছে ✅');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'সমস্যা হয়েছে');
    }
  };

  const handleMappingChange = async (employeeId, devicePin) => {
    try {
      if (devicePin) {
        await attendanceApi.assignDeviceMapping(employeeId, devicePin);
      } else {
        await attendanceApi.clearDeviceMapping(employeeId);
      }
      toast.success('আপডেট হয়েছে ✅');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'সমস্যা হয়েছে');
    }
  };

  const handleToggleDeviceActive = async (device) => {
    try {
      await attendanceApi.updateDevice(device.id, { is_active: !device.is_active });
      toast.success('আপডেট হয়েছে ✅');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'সমস্যা হয়েছে');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-dark">Biometric Device Sync</h1>
        <button onClick={() => setShowRegister(true)} className="btn-primary max-w-xs">+ Device নিবন্ধন</button>
      </div>

      {/* Device Registry */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-4">নিবন্ধিত ডিভাইস</h3>
        {devices.length === 0 ? (
          <p className="text-sm text-gray-400">এখনও কোনো ডিভাইস নিবন্ধিত হয়নি</p>
        ) : (
          <div className="space-y-2">
            {devices.map(d => (
              <div key={d.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                <div>
                  <p className="text-sm font-medium">{d.name || d.serial_number} {d.location && <span className="text-gray-400">— {d.location}</span>}</p>
                  <p className="text-xs text-gray-400">SN: {d.serial_number} · শেষ যোগাযোগ: {d.last_seen_at ? format(new Date(d.last_seen_at), 'dd MMM, hh:mm a') : 'কখনো না'}</p>
                </div>
                <button onClick={() => handleToggleDeviceActive(d)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                  {d.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unmapped Punches */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-1">নতুন / Unmapped Fingerprint PIN</h3>
        <p className="text-xs text-gray-400 mb-4">ডিভাইসে punch হয়েছে কিন্তু কোনো কর্মীর সাথে এখনও assign করা হয়নি</p>
        {unmapped.length === 0 ? (
          <p className="text-sm text-gray-400">সব PIN কর্মীর সাথে assign করা আছে</p>
        ) : (
          <div className="space-y-2">
            {unmapped.map(u => (
              <div key={`${u.device_serial}-${u.device_pin}`} className="flex items-center justify-between bg-amber-50 rounded-xl p-3 gap-3">
                <div>
                  <p className="text-sm font-medium">PIN: {u.device_pin}</p>
                  <p className="text-xs text-gray-400">{u.punch_count} বার punch · শেষ: {format(new Date(u.last_seen), 'dd MMM, hh:mm a')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select className="input-field max-w-[200px]" value={pendingAssign[u.device_pin] || ''}
                    onChange={e => setPendingAssign(p => ({ ...p, [u.device_pin]: e.target.value }))}>
                    <option value="">-- কর্মী বেছে নিন --</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                  </select>
                  <button onClick={() => handleAssign(u.device_pin)} className="btn-primary max-w-[100px] py-2">Assign</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Mappings */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-4">কর্মী ↔ Device PIN Mapping</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {employees.map(emp => (
            <div key={emp.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <div>
                <p className="text-sm font-medium">{emp.full_name}</p>
                <p className="text-xs text-gray-400">{emp.designation}</p>
              </div>
              <input className="input-field max-w-[120px] text-center" defaultValue={emp.device_user_id || ''}
                placeholder="PIN"
                onBlur={e => {
                  const value = e.target.value.trim();
                  if (value !== (emp.device_user_id || '')) handleMappingChange(emp.id, value);
                }} />
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sync Log */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-4">সাম্প্রতিক Sync Log</h3>
        {punches.length === 0 ? (
          <p className="text-sm text-gray-400">এখনও কোনো punch পাওয়া যায়নি</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b">
                  <th className="py-2 pr-3">সময়</th>
                  <th className="py-2 pr-3">কর্মী</th>
                  <th className="py-2 pr-3">PIN</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {punches.map(p => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">{format(new Date(p.punch_time), 'dd MMM, hh:mm:ss a')}</td>
                    <td className="py-2 pr-3">{p.employee_name || <span className="text-amber-500">Unmapped</span>}</td>
                    <td className="py-2 pr-3">{p.device_pin}</td>
                    <td className="py-2 pr-3">
                      {p.process_error
                        ? <span className="text-red-500 text-xs">Error: {p.process_error}</span>
                        : p.processed
                          ? <span className="text-green-600 text-xs">Processed</span>
                          : <span className="text-gray-400 text-xs">Pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showRegister && <RegisterDeviceModal onClose={() => setShowRegister(false)} onSaved={fetchAll} />}
    </div>
  );
}
