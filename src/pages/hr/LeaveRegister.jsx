import { useState, useEffect } from 'react';
import { leaveApi } from '../../api/client';

export default function LeaveRegister() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  useEffect(() => {
    setLoading(true);
    leaveApi.getRegister(year).then(r => {
      setData(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [year]);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  // Group by employee
  const byEmployee = {};
  data.forEach(row => {
   if (!byEmployee[row.employee_id]) {
      byEmployee[row.employee_id] = {
        id: row.employee_id,
        name: row.full_name,
        phone: row.phone,
        designation: row.designation,
        department: row.department,
        joiningDate: row.joining_date,
        leaves: [],
      };
    }
    byEmployee[row.employee_id].leaves.push(row);
  });

  const employees = Object.values(byEmployee).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-display font-bold text-dark">Leave Register</h1>
        <div className="flex gap-2">
          <select className="input-field max-w-xs" value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)}>
            <option value="">-- কর্মী বেছে নিন --</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} {emp.phone ? `— ${emp.phone}` : ''}</option>
            ))}
          </select>
          <select className="input-field max-w-[120px]" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {!selectedEmployeeId ? (
        <div className="card text-center py-12 text-gray-400">কর্মী নির্বাচন করুন তার Leave History দেখার জন্য</div>
      ) : !selectedEmployee ? (
        <div className="card text-center py-12 text-gray-400">এই বছরে কোনো leave তথ্য নেই</div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold">{selectedEmployee.name}</p>
              <p className="text-xs text-gray-400">{selectedEmployee.designation || '—'} {selectedEmployee.department ? `• ${selectedEmployee.department}` : ''} {selectedEmployee.phone ? `• ${selectedEmployee.phone}` : ''}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['ছুটির ধরন', 'মোট', 'ব্যবহৃত', 'বাকি'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {selectedEmployee.leaves.map(l => {
                  const noJoiningDate = !selectedEmployee.joiningDate;
                  return (
                    <tr key={l.leave_type_id}>
                      <td className="px-3 py-2">{l.name_bn} ({l.code})</td>
                      {noJoiningDate && l.eligibility_months > 0 ? (
                        <td colSpan={3} className="px-3 py-2 text-amber-600 text-xs">জয়েনিং ডেট দেওয়া হয়নি — eligibility যাচাই করা যাচ্ছে না</td>
                      ) : (
                        <>
                          <td className="px-3 py-2">{l.total_days} দিন</td>
                          <td className="px-3 py-2 text-amber-600">{l.used_days} দিন</td>
                          <td className="px-3 py-2 font-medium text-green-600">{l.remaining_days} দিন</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}