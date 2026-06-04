import { createClient } from "@supabase/supabase-js";
import { getFirstEnv } from "./_payment-config.js";

let adminClient;

export function getSupabaseAdmin() {
  if (!adminClient) {
    const supabaseUrl = getFirstEnv(["SUPABASE_URL", "SUPABASE_PUBLICSUPABASE_URL"]);
    const supabaseServiceKey = getFirstEnv(["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"]);

    adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return adminClient;
}
