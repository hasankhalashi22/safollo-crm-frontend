const STATUS_COLORS = {
  active: 'bg-green-50 text-green-600',
  inactive: 'bg-gray-100 text-gray-500',
  on_leave: 'bg-amber-50 text-amber-600',
  resigned: 'bg-red-50 text-red-500',
  terminated: 'bg-red-50 text-red-500',
  pending: 'bg-amber-50 text-amber-600',
  approved: 'bg-green-50 text-green-600',
  rejected: 'bg-red-50 text-red-500',
};

export default function StatusBadge({ status, label }) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-500';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>
      {label || status}
    </span>
  );
}