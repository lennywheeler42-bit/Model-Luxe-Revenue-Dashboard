/* ═══════════════════════════════════════════════════════════════════
   Shared email and password rules.

   These run in the browser so people get an answer while typing. They
   are not the enforcement: the same checks run again in the edge
   functions, and Supabase Auth applies the minimum length centrally,
   so a tampered client gains nothing.

   Kept deliberately close to NIST guidance — length and a breach-style
   blocklist, rather than composition rules, which push people toward
   predictable substitutions like "Password1!".
   ══════════════════════════════════════════════════════════════════ */

export const PASSWORD_MIN_LENGTH = 12;

/* Deliberately conservative. A stricter pattern rejects addresses that
   are perfectly valid, which is worse than letting a typo through —
   the invite is bound to this address, so a wrong one simply fails. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/* Supabase's leaked-password check is a paid feature, so the most
   predictable choices are blocked here instead. */
const COMMON_PASSWORDS = [
  "password", "passw0rd", "letmein", "welcome", "qwerty", "iloveyou",
  "admin", "administrator", "changeme", "secret", "monkey", "dragon",
  "sunshine", "princess", "football", "baseball", "trustno1", "abc123",
  "111111", "123123", "654321", "superman", "starwars", "whatever",
];

export function emailProblem(email: string): string | null {
  const trimmed = (email || "").trim();
  if (!trimmed) return "Enter an email address.";
  if (trimmed.length > 254) return "That email address is too long.";
  if (!EMAIL_PATTERN.test(trimmed)) return "That does not look like an email address.";
  return null;
}

export function passwordProblem(password: string, email = ""): string | null {
  const value = password || "";

  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (value.length > 72) {
    /* bcrypt silently ignores anything past 72 bytes */
    return "Use 72 characters or fewer.";
  }
  if (/^\s|\s$/.test(value)) {
    return "Remove the space at the start or end.";
  }

  const lowered = value.toLowerCase();

  if (new Set(lowered).size < 5) {
    return "That repeats too few characters to be a password.";
  }
  if (COMMON_PASSWORDS.some((common) => lowered.includes(common))) {
    return "That contains a very common password. Choose something else.";
  }
  if (/^[0-9]+$/.test(value)) {
    return "Digits alone are easy to guess. Add words or letters.";
  }
  if (isSequential(lowered)) {
    return "Avoid straight runs like abcdefghijkl or 123456789012.";
  }

  const localPart = (email || "").split("@")[0].toLowerCase();
  if (localPart.length >= 3 && lowered.includes(localPart)) {
    return "Do not put your email address in your password.";
  }

  return null;
}

function isSequential(value: string): boolean {
  let ascending = 0;
  for (let index = 1; index < value.length; index += 1) {
    ascending = value.charCodeAt(index) === value.charCodeAt(index - 1) + 1 ? ascending + 1 : 0;
    if (ascending >= 6) return true;
  }
  return false;
}

/* Feedback while typing. Length carries most of the weight because it
   is what actually resists guessing. */
export function passwordStrength(password: string, email = "") {
  const value = password || "";
  if (!value) return { score: 0, label: "", tone: "" };

  let score = 0;
  if (value.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (value.length >= 16) score += 1;
  if (value.length >= 20) score += 1;
  if (new Set(value).size >= 12) score += 1;

  if (passwordProblem(value, email)) return { score: 1, label: "Too weak", tone: "weak" };
  if (score <= 1) return { score: 2, label: "Acceptable", tone: "ok" };
  if (score <= 2) return { score: 3, label: "Good", tone: "good" };
  return { score: 4, label: "Strong", tone: "strong" };
}
