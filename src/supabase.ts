import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/* The app renders a setup notice instead of a login screen when these are
   missing, rather than throwing on import and showing a blank page. */
export const supabaseConfigured = Boolean(supabaseUrl && publishableKey);

export const supabase = createClient(supabaseUrl || "http://localhost", publishableKey || "missing-key", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

export const ORG_ID = "model-luxe";
