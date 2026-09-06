import "server-only";

import {
  createServiceRoleDatabaseClient,
} from "@hirewatch/db";


function requireEnv(
  name: string,
): string {
  const value =
    process.env[name];

  if (!value) {
    throw new Error(
      `Missing server environment variable: ${name}`,
    );
  }

  return value;
}


export function createServiceRoleClient() {
  return createServiceRoleDatabaseClient({
    url:
      requireEnv(
        "NEXT_PUBLIC_SUPABASE_URL",
      ),

    serviceRoleKey:
      requireEnv(
        "SUPABASE_SERVICE_ROLE_KEY",
      ),
  });
}