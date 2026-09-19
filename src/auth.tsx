/* ═══════════════════════════════════════════════════════════════════
   Authentication — sign in, and redeeming an invite code.

   There is no public sign-up. An admin issues a code bound to one email
   address; redeeming it creates the account with the permissions the
   admin chose, and the member sets their own password at that moment.
   ══════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from "react";
import { supabase, supabaseConfigured } from "./supabase";
import { emailProblem, passwordProblem, passwordStrength,
         PASSWORD_MIN_LENGTH } from "./validation";

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) { setProfile(null); setLoading(false); }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;

    supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Could not load profile:", error.message);
        setProfile(data);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [session?.user?.id]);

  return { session, profile, loading, signOut: () => supabase.auth.signOut() };
}

/* supabase-js reports a non-2xx edge function response as a bare
   "Edge Function returned a non-2xx status code" and discards the body,
   which hides the reason the request was refused. The body is still on
   the attached Response, so read it back and use the real message. */
async function callEdgeFunction(name: string, body: unknown) {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (!error) {
    if (data?.error) return { ok: false, message: data.error };
    return { ok: true, message: "" };
  }

  let message = error.message || "That request could not be completed.";
  const response = (error as any)?.context;

  if (response && typeof response.json === "function") {
    try {
      const parsed = await response.json();
      if (parsed?.error) message = parsed.error;
    } catch {
      /* not JSON — keep the generic message */
    }
  }

  return { ok: false, message };
}

/* ─────────────────────────── shared new-password controls ── */

/* Used by every screen that sets a password, so the rules and the
   wording cannot drift between them. */
function PasswordFields({ email, password, setPassword, confirm, setConfirm,
                          label = "Choose a password" }) {
  const strength = passwordStrength(password, email);
  const problem = password ? passwordProblem(password, email) : null;

  return (
    <>
      <label className="auth-label">{label}</label>
      <input className="auth-input" type="password" value={password} autoComplete="new-password"
        onChange={(e) => setPassword(e.target.value)} required />

      {password && (
        <div className="pw-meter">
          <div className="pw-track">
            <div className={"pw-fill pw-" + strength.tone}
              style={{ width: (strength.score / 4) * 100 + "%" }} />
          </div>
          <span className={"pw-word pw-" + strength.tone}>{strength.label}</span>
        </div>
      )}

      <p className="pw-hint">
        {problem || `At least ${PASSWORD_MIN_LENGTH} characters. Length beats symbols.`}
      </p>

      <label className="auth-label">Confirm password</label>
      <input className="auth-input" type="password" value={confirm} autoComplete="new-password"
        onChange={(e) => setConfirm(e.target.value)} required />
      {confirm && confirm !== password && (
        <p className="pw-hint pw-weak">Those do not match yet.</p>
      )}
    </>
  );
}

/* Returns the first thing wrong with a new-password submission. */
function newPasswordProblem(email, password, confirm) {
  if (email !== null) {
    const badEmail = emailProblem(email);
    if (badEmail) return badEmail;
  }
  const badPassword = passwordProblem(password, email || "");
  if (badPassword) return badPassword;
  if (password !== confirm) return "Those passwords do not match.";
  return null;
}

/* ─────────────────────────────────────────────────── sign in ── */

function SignInForm({ onNeedInvite, onForgot }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    });
    if (signInError) setError(signInError.message);
    setBusy(false);
  };

  return (
    <form className="auth-card" onSubmit={submit}>
      <div className="eyebrow">Revenue Dashboard</div>
      <h1 className="auth-title">Model Luxe Media</h1>
      <p className="auth-sub">Sign in to continue.</p>

      <label className="auth-label">Email</label>
      <input className="auth-input" type="email" value={email} autoComplete="username"
        onChange={(e) => setEmail(e.target.value)} required />

      <label className="auth-label">Password</label>
      <input className="auth-input" type="password" value={password} autoComplete="current-password"
        onChange={(e) => setPassword(e.target.value)} required />

      {error && <p className="auth-error">{error}</p>}

      <button className="auth-btn" type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <button className="auth-link" type="button" onClick={onNeedInvite}>
        I have an invite code
      </button>

      <button className="auth-link" type="button" onClick={onForgot}>
        I forgot my password
      </button>
    </form>
  );
}

/* ────────────────────────────────────────── redeem an invite ── */

function RedeemForm({ onBack }) {
  const [email, setEmail]       = useState("");
  const [code, setCode]         = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const problem = newPasswordProblem(email.trim(), password, confirm);
    if (problem) { setError(problem); return; }

    if (!code.trim()) { setError("Enter the invite code your admin sent you."); return; }

    setBusy(true);
    const redeemed = await callEdgeFunction("redeem-invite", {
      email: email.trim(), code: code.trim(), password,
    });

    if (!redeemed.ok) { setError(redeemed.message); setBusy(false); return; }

    /* Account exists now — sign straight in so they never see this screen twice. */
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    });
    if (signInError) { setError(signInError.message); setBusy(false); }
  };

  return (
    <form className="auth-card" onSubmit={submit}>
      <div className="eyebrow">Invitation</div>
      <h1 className="auth-title">Set up your account</h1>
      <p className="auth-sub">Enter the code your admin sent you, then choose a password.</p>

      <label className="auth-label">Email</label>
      <input className="auth-input" type="email" value={email}
        onChange={(e) => setEmail(e.target.value)} required />

      <label className="auth-label">Invite code</label>
      <input className="auth-input auth-code" value={code} placeholder="XXXX-XXXX"
        onChange={(e) => setCode(e.target.value.toUpperCase())} required />

      <PasswordFields email={email} password={password} setPassword={setPassword}
        confirm={confirm} setConfirm={setConfirm} />

      {error && <p className="auth-error">{error}</p>}

      <button className="auth-btn" type="submit" disabled={busy}>
        {busy ? "Setting up…" : "Create my account"}
      </button>

      <button className="auth-link" type="button" onClick={onBack}>
        Back to sign in
      </button>
    </form>
  );
}


/* ────────────────────────────────── reset a forgotten password ── */

function ResetForm({ onBack }) {
  const [email, setEmail]       = useState("");
  const [code, setCode]         = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const problem = newPasswordProblem(email.trim(), password, confirm);
    if (problem) { setError(problem); return; }

    if (!code.trim()) { setError("Enter the reset code your admin sent you."); return; }

    setBusy(true);
    const reset = await callEdgeFunction("reset-password", {
      email: email.trim(), code: code.trim(), password,
    });

    if (!reset.ok) { setError(reset.message); setBusy(false); return; }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    });
    if (signInError) { setError(signInError.message); setBusy(false); }
  };

  return (
    <form className="auth-card" onSubmit={submit}>
      <div className="eyebrow">Password reset</div>
      <h1 className="auth-title">Choose a new password</h1>
      <p className="auth-sub">Enter the reset code your admin gave you.</p>

      <label className="auth-label">Email</label>
      <input className="auth-input" type="email" value={email}
        onChange={(e) => setEmail(e.target.value)} required />

      <label className="auth-label">Reset code</label>
      <input className="auth-input auth-code" value={code} placeholder="XXXX-XXXX"
        onChange={(e) => setCode(e.target.value.toUpperCase())} required />

      <PasswordFields email={email} password={password} setPassword={setPassword}
        confirm={confirm} setConfirm={setConfirm} label="New password" />

      {error && <p className="auth-error">{error}</p>}

      <button className="auth-btn" type="submit" disabled={busy}>
        {busy ? "Updating…" : "Set new password"}
      </button>

      <button className="auth-link" type="button" onClick={onBack}>
        Back to sign in
      </button>
    </form>
  );
}

/* ─────────────────── change your own password while signed in ── */

export function ChangePassword({ onClose }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false);
  const [busy, setBusy]         = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const problem = newPasswordProblem(null, password, confirm);
    if (problem) { setError(problem); return; }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) { setError(updateError.message); return; }
    setDone(true);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="auth-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h1 className="auth-title">Change your password</h1>

        {done ? (
          <>
            <p className="auth-sub">Your password has been changed.</p>
            <button className="auth-btn" type="button" onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            <p className="auth-sub">Choose something you are not using elsewhere.</p>

            <PasswordFields email="" password={password} setPassword={setPassword}
              confirm={confirm} setConfirm={setConfirm} label="New password" />

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-btn" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Change password"}
            </button>
            <button className="auth-link" type="button" onClick={onClose}>Cancel</button>
          </>
        )}
      </form>
    </div>
  );
}

export function AuthScreen() {
  const [mode, setMode] = useState("signin");   // signin | invite | reset

  if (!supabaseConfigured) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1 className="auth-title">Setup needed</h1>
          <p className="auth-sub">
            Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to your environment, then reload.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      {mode === "invite" && <RedeemForm onBack={() => setMode("signin")} />}
      {mode === "reset"  && <ResetForm  onBack={() => setMode("signin")} />}
      {mode === "signin" && (
        <SignInForm
          onNeedInvite={() => setMode("invite")}
          onForgot={() => setMode("reset")} />
      )}
    </div>
  );
}
