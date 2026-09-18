/* ═══════════════════════════════════════════════════════════════════
   Server-side email and password rules.

   Mirrors src/validation.ts. The browser copy exists to give people an
   answer while typing; this copy is the one that decides, because a
   request can reach these functions without going through the app at
   all. Supabase Auth applies the minimum length again underneath.

   Keep the two in step when either changes.
   ══════════════════════════════════════════════════════════════════ */

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;   // bcrypt ignores anything beyond this

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

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
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`;
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
