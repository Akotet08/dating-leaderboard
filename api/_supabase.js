import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "./_payment-config.js";

let adminClient;

export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(getRequiredEnv("SUPABASE_URL"), getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return adminClient;
}
