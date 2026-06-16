import { useState, useEffect } from 'react';
import { hrApi } from '../../api/client';
import { User } from 'lucide-react';

export default function Organogram() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hrApi.getOrganogram().then(r => {
      setEmployees(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="spinner w-8 h-8" /></div>;

  const buildTree = (parentId = null) => {
    return employees
      .filter(e => (e.reports_to || null) === parentId)
      .map(e => ({ ...e, children: buildTree(e.id) }));
  };

  const tree = buildTree(null);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-display font-bold text-dark mb-6">Organogram</h1>

      {tree.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No hierarchy data found. Set "Reports To" in Employee Directory.</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex flex-col items-center min-w-max p-4">
            {tree.map(node => <TreeNode key={node.id} node={node} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function TreeNode({ node }) {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white border-2 border-primary-100 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3 min-w-[200px]">
        <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
          <User size={18} />
        </div>
        <div>
          <p className="font-semibold text-sm">{node.full_name || 'Unnamed'}</p>
          <p className="text-xs text-gray-400">{node.designation || '—'}{node.department ? ` · ${node.department}` : ''}</p>
        </div>
      </div>

      {hasChildren && (
        <>
          <div className="w-px h-6 bg-gray-300" />
          <div className="flex gap-6 relative">
            {node.children.length > 1 && (
              <div className="absolute top-0 left-0 right-0 h-px bg-gray-300" style={{ top: 0 }} />
            )}
            {node.children.map(child => (
              <div key={child.id} className="flex flex-col items-center pt-0">
                <TreeNode node={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}