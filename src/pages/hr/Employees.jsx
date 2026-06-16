import { useState, useEffect } from 'react';
import { hrApi } from '../../api/client';
import toast from 'react-hot-toast';
import { Edit2, User } from 'lucide-react';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);

  const fetchEmployees = () => {
    setLoading(true);
    hrApi.getEmployees().then(r => {
      setEmployees(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchEmployees(); }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">Employee Directory</h1>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Designation', 'Department', 'Reports To', 'Type', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No employees found</td></tr>
              ) : employees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="font-medium">{emp.full_name || emp.phone}</p>
                        <p className="text-xs text-gray-400">{emp.role_label}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.designation || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.department || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{emp.reports_to_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {emp.is_remote ? 'Remote' : 'On-site'} {emp.employment_type ? `(${emp.employment_type})` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${emp.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      {emp.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEditModal(emp)}
                      className="px-2 py-1 bg-primary-50 text-primary-600 rounded-lg text-xs font-medium">
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editModal && (
        <EmployeeEditModal
          employee={editModal}
          allEmployees={employees}
          onClose={() => setEditModal(null)}
          onSuccess={() => { setEditModal(null); fetchEmployees(); }}
        />
      )}
    </div>
  );
}

function EmployeeEditModal({ employee, allEmployees, onClose, onSuccess }) {
const [form, setForm] = useState({
    position_id: employee.position_id || '',
    designation: employee.designation || '',
    department: employee.department || '',
    reports_to: employee.reports_to || '',
    employment_type: employee.employment_type || 'full_time',
    office_start_time: employee.office_start_time || '09:00',
    office_end_time: employee.office_end_time || '17:00',
    is_remote: employee.is_remote || false,
    basic_salary: employee.basic_salary || '',
    status: employee.status || 'active',
  });
  const [loading, setLoading] = useState(false);

const [positions, setPositions] = useState([]);

  useEffect(() => {
    hrApi.getPositions().then(r => {
      const flatten = (list) => list.flatMap(p => [p, ...flatten(p.children || [])]);
      // positions API returns flat list already (no children nesting) - use directly
      setPositions(r.data || []);
    });
  }, []);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await hrApi.updateEmployeeDetails(employee.id, form);
      toast.success('Employee details updated ✅');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">{employee.full_name || employee.phone}</h3>
          <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Position (Organogram)</label>
            <select className="input-field" value={form.position_id}
              onChange={e => set('position_id', e.target.value)}>
              <option value="">-- None --</option>
              {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Designation (Display Text)</label>
            <input type="text" className="input-field" value={form.designation}
              onChange={e => set('designation', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Department</label>
            <input type="text" className="input-field" value={form.department}
              onChange={e => set('department', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Reports To</label>
            <select className="input-field" value={form.reports_to}
              onChange={e => set('reports_to', e.target.value)}>
              <option value="">-- None --</option>
              {allEmployees.filter(e => e.id !== employee.id).map(e => (
                <option key={e.id} value={e.id}>{e.full_name || e.phone}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Employment Type</label>
            <select className="input-field" value={form.employment_type}
              onChange={e => set('employment_type', e.target.value)}>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contractual">Contractual</option>
              <option value="intern">Intern</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_remote}
              onChange={e => set('is_remote', e.target.checked)} />
            <label className="text-sm">Remote Employee</label>
          </div>
          {!form.is_remote && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Office Start</label>
                <input type="time" className="input-field" value={form.office_start_time}
                  onChange={e => set('office_start_time', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Office End</label>
                <input type="time" className="input-field" value={form.office_end_time}
                  onChange={e => set('office_end_time', e.target.value)} />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">Basic Salary</label>
            <input type="number" className="input-field" value={form.basic_salary}
              onChange={e => set('basic_salary', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Status</label>
            <select className="input-field" value={form.status}
              onChange={e => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="resigned">Resigned</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : '✅ Save'}
          </button>
        </form>
      </div>
    </div>
  );
}