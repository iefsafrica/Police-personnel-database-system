import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

/**
 * Checks if a given role is allowed to perform an action on a resource.
 * Superadmin automatically bypasses all checks and is allowed.
 */
export async function hasPermission(role: string, resource: string, action: string): Promise<boolean> {
  if (!role) return false;
  const normalizedRole = role.toLowerCase().trim();

  // Superadmin has absolute permission to all resources
  if (normalizedRole === 'superadmin') {
    return true;
  }

  try {
    const result = await sql`
      SELECT is_allowed 
      FROM admin_permissions
      WHERE LOWER(role) = ${normalizedRole}
        AND (LOWER(resource) = ${resource.toLowerCase()} OR resource = '*')
        AND (LOWER(action) = ${action.toLowerCase()} OR action = '*')
      LIMIT 1
    `;
    return result[0]?.is_allowed ?? false;
  } catch (error) {
    console.error("Error checking permissions in database:", error);
    return false;
  }
}
