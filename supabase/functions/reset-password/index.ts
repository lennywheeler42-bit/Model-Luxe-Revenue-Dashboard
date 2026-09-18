/* ═══════════════════════════════════════════════════════════════════
   reset-password

   Sets a new password from an admin-issued reset code. Server side
   because changing a password needs the service role key.

   The code is bound to one email: the stored digest is salted with
   that address, so a code lifted from one person cannot be used
   against another account.
   ══════════════════════════════════════════════════════════════════ */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { emailProblem, passwordProblem } from "../_shared/validation.ts";

const MAX_ATTEMPTS = 10;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/* Must match public.hash_invite_code() in the database exactly. */
async function hashCode(code: string, email: string): Promise<string> {
  const payload = `${email.trim().toLowerCase()}:${code.trim().toUpperCase()}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let email = "", code = "", password = "";
  try {
    const body = await request.json();
    email = String(body.email || "").trim().toLowerCase();
    code = String(body.code || "").trim().toUpperCase();
    password = String(body.password || "");
  } catch {
    return json({ error: "Malformed request." }, 400);
  }

  const badEmail = emailProblem(email);
  if (badEmail) return json({ error: badEmail }, 400);
  if (!code) return json({ error: "Enter the reset code your admin sent you." }, 400);

  const badPassword = passwordProblem(password, email);
  if (badPassword) return json({ error: badPassword }, 400);

  const { data: openResets } = await admin
    .from("password_resets").select("*")
    .eq("email", email).is("used_at", null).is("revoked_at", null);

  const resets = openResets || [];
  if (resets.some((reset) => reset.attempts >= MAX_ATTEMPTS)) {
    return json({ error: "Too many attempts. Ask your admin to issue a new code." }, 429);
  }

  const codeHash = await hashCode(code, email);
  const reset = resets.find((candidate) => candidate.code_hash === codeHash);

  if (!reset) {
    /* Deliberately vague: never confirm whether an account exists. */
    await Promise.all(resets.map((candidate) =>
      admin.from("password_resets").update({ attempts: candidate.attempts + 1 }).eq("id", candidate.id)));
    return json({ error: "That email and code do not match an open reset." }, 400);
  }

  if (new Date(reset.expires_at) < new Date()) {
    return json({ error: "That reset code has expired. Ask your admin for a new one." }, 400);
  }

  const { error: updateError } =
    await admin.auth.admin.updateUserById(reset.user_id, { password });

  if (updateError) return json({ error: updateError.message }, 400);

  await admin.from("password_resets")
    .update({ used_at: new Date().toISOString() }).eq("id", reset.id);

  /* Any session opened with the old password is no longer wanted. */
  await admin.auth.admin.signOut(reset.user_id, "global").catch(() => {});

  return json({ ok: true });
});
