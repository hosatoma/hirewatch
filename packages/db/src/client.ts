import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type {
  Database,
} from "./database.types.js";


export type HireWatchDatabaseClient =
  SupabaseClient<Database>;


export type CreateServiceRoleClientInput = {
  url: string;

  serviceRoleKey: string;
};


export function createServiceRoleDatabaseClient(
  input: CreateServiceRoleClientInput,
): HireWatchDatabaseClient {
  if (input.url.trim().length === 0) {
    throw new Error(
      "Supabase URL must not be empty",
    );
  }

  if (
    input.serviceRoleKey.trim().length === 0
  ) {
    throw new Error(
      "Supabase service role key must not be empty",
    );
  }

  return createClient<Database>(
    input.url,
    input.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}