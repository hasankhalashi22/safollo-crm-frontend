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

// Convenience check: does this user have entry-level access (editor or above)?
export function canEditModule(user, moduleKey) {
  const role = getModuleRole(user, moduleKey);
  return role === 'editor' || role === 'admin' || role === 'hr_manager';
}

// Convenience check: can this user edit/update existing records (admin or above)?
export function canUpdateModule(user, moduleKey) {
  const role = getModuleRole(user, moduleKey);
  return role === 'admin' || role === 'hr_manager';
}

// ── Academy-specific permission helpers ──────────────────────────────────────
// viewer/editor/admin can view; super_admin always via getModuleRole returning 'admin'
export function canViewAcademy(user) {
  return !!getModuleRole(user, 'academy');
}
// editor and admin can create/edit; not viewer
export function canEditAcademy(user) {
  const role = getModuleRole(user, 'academy');
  return role === 'editor' || role === 'admin';
}
// admin can delete teachers and zoom accounts; courses/batches/payments nobody can delete
export function canDeleteAcademy(user) {
  return getModuleRole(user, 'academy') === 'admin';
}
// editor and admin can approve feedback
export function canApproveFeedback(user) {
  const role = getModuleRole(user, 'academy');
  return role === 'editor' || role === 'admin';
}
// only admin can access settings
export function canManageAcademySettings(user) {
  return getModuleRole(user, 'academy') === 'admin';
}