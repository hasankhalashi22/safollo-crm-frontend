// Returns the role_key this user has for a given module, or null if no access.
// super_admin always gets full access regardless of module_access records.
export function getModuleRole(user, moduleKey) {
  if (!user) return null;
  if (user.role === 'super_admin') return 'admin'; // super_admin always has top-level role everywhere
  const entry = (user.module_access || []).find(a => a.module_key === moduleKey);
  return entry ? entry.role_key : null;
}

// Convenience check: does this user have at least "viewer" level access to a module?
export function hasModuleAccess(user, moduleKey) {
  return !!getModuleRole(user, moduleKey);
}

// Convenience check: does this user have edit-level access (editor or admin) to a module?
export function canEditModule(user, moduleKey) {
  const role = getModuleRole(user, moduleKey);
  return role === 'editor' || role === 'admin' || role === 'hr_manager';
}