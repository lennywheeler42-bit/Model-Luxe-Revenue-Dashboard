/* ═══════════════════════════════════════════════════════════════════
   redeem-invite

   Creates an account from an invite code. Runs server side because it
   needs the service role key, which must never reach a browser.

   The code is only ever valid for the email it was issued to: the
   stored digest is salted with that address, so the same code under a
   different email produces a different hash and cannot match.
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
async function hashInviteCode(code: string, email: string): Promise<string> {
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
  if (!code) return json({ error: "Enter the invite code your admin sent you." }, 400);

  const badPassword = passwordProblem(password, email);
  if (badPassword) return json({ error: badPassword }, 400);

  /* Throttle per address so codes cannot be guessed by repetition. */
  const { data: openInvites } = await admin
    .from("invites").select("*")
    .eq("email", email).is("claimed_at", null).is("revoked_at", null);

  const invites = openInvites || [];
  if (invites.some((invite) => invite.attempts >= MAX_ATTEMPTS)) {
    return json({ error: "Too many attempts. Ask your admin to reissue the code." }, 429);
  }

  const codeHash = await hashInviteCode(code, email);
  const invite = invites.find((candidate) => candidate.code_hash === codeHash);

  if (!invite) {
    /* Deliberately vague: never reveal whether the address was invited. */
    await Promise.all(invites.map((candidate) =>
      admin.from("invites").update({ attempts: candidate.attempts + 1 }).eq("id", candidate.id)));
    return json({ error: "That email and code do not match an open invitation." }, 400);
  }

  if (new Date(invite.expires_at) < new Date()) {
    return json({ error: "That invitation has expired. Ask your admin for a new code." }, 400);
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({ email, password, email_confirm: true });

  if (createError || !created?.user) {
    return json({ error: createError?.message || "Could not create the account." }, 400);
  }

  /* The signup trigger already inserted a profile row; apply the
     role and permissions the admin chose when issuing the invite. */
  const { error: profileError } = await admin.from("profiles").update({
    role: invite.role,
    permissions: invite.permissions,
    member_id: invite.member_id,
    status: "active",
    invited_by: invite.created_by,
  }).eq("id", created.user.id);

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);   // leave no half-made account
    return json({ error: "Could not apply your permissions. Ask your admin to retry." }, 500);
  }

  await admin.from("invites").update({
    claimed_at: new Date().toISOString(), claimed_by: created.user.id,
  }).eq("id", invite.id);

  return json({ ok: true });
});
