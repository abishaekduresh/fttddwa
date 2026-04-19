/**
 * Role weights for hierarchy enforcement.
 * Higher weight = Higher rank.
 */
export const ROLE_WEIGHTS: Record<string, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  DATA_ENTRY: 60,
  VIEWER: 40,
};

/**
 * Returns the weight of a role. Defaults to lowest (VIEWER) if not found.
 */
export function getRoleWeight(roleName: string | null | undefined): number {
  if (!roleName) return 0;
  return ROLE_WEIGHTS[roleName] || ROLE_WEIGHTS.VIEWER;
}

/**
 * Checks if a 'manager' role can manage a 'target' role.
 * Rule: Manager weight must be greater than or equal to target weight.
 * (Wait, maybe strictly greater? User said "lower role to edit upper role". 
 * Usually, same-rank items can manage each other unless strictly forbidden. 
 * I'll use >= to allow admins to manage admins, but you can't manage upper.)
 */
export function canManageRole(managerRole: string, targetRole: string): boolean {
  // Super Admin can always manage everyone
  if (managerRole === "SUPER_ADMIN") return true;
  
  const managerWeight = getRoleWeight(managerRole);
  const targetWeight = getRoleWeight(targetRole);
  
  return managerWeight >= targetWeight;
}
