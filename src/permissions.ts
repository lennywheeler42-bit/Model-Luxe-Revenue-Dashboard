/* ═══════════════════════════════════════════════════════════════════
   Permission helpers — presentation only.

   Every rule here is also enforced in Postgres by row level security.
   Hiding a tab is a convenience, never a security boundary: a member
   who is not permitted to read a section never receives its rows, so
   bypassing this file yields empty state rather than hidden data.
   ══════════════════════════════════════════════════════════════════ */

export type PermissionLevel = "none" | "view" | "own" | "edit";

export const TABS = [
  { id: "rev",      label: "Revenue",        levels: ["none", "view", "edit"] },
  { id: "team",     label: "Team",           levels: ["none", "view", "edit"] },
  { id: "sales",    label: "Sales",          levels: ["none", "view", "edit"] },
  { id: "org",      label: "Org",            levels: ["none", "view", "edit"] },
  { id: "comm",     label: "Comp & Bonuses", levels: ["none", "own", "view", "edit"] },
  { id: "charts",   label: "Charts",         levels: ["none", "view"] },
  { id: "settings", label: "Settings",       levels: ["none", "view", "edit"] },
] as const;

export const CAPABILITIES = [
  { id: "canCloseWeek",     label: "Close the week" },
  { id: "canManageMembers", label: "Invite and manage members" },
  { id: "canResetData",     label: "Reset all data" },
] as const;

export const LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: "No access",
  view: "View only",
  own:  "Own record only",
  edit: "Can edit",
};

export const defaultPermissions = () => ({
  tabs: {
    rev: "view", team: "view", sales: "edit", org: "none",
    comm: "own", charts: "view", settings: "none",
  } as Record<string, PermissionLevel>,
  canCloseWeek: false,
  canManageMembers: false,
  canResetData: false,
});

export const PRESETS: Record<string, { label: string; permissions: any }> = {
  manager: {
    label: "Manager",
    permissions: {
      tabs: { rev: "edit", team: "edit", sales: "edit", org: "edit",
              comm: "view", charts: "view", settings: "none" },
      canCloseWeek: true, canManageMembers: false, canResetData: false,
    },
  },
  salesRep: {
    label: "Sales rep",
    permissions: defaultPermissions(),
  },
  viewer: {
    label: "Viewer",
    permissions: {
      tabs: { rev: "view", team: "view", sales: "view", org: "none",
              comm: "own", charts: "view", settings: "none" },
      canCloseWeek: false, canManageMembers: false, canResetData: false,
    },
  },
};

const isAdmin = (profile) => profile?.role === "admin";

export function tabLevel(profile, tabId: string): PermissionLevel {
  if (isAdmin(profile)) return "edit";
  return (profile?.permissions?.tabs?.[tabId] as PermissionLevel) || "none";
}

export const canViewTab = (profile, tabId: string) => tabLevel(profile, tabId) !== "none";
export const canEditTab = (profile, tabId: string) => tabLevel(profile, tabId) === "edit";

export function hasCapability(profile, capability: string): boolean {
  if (isAdmin(profile)) return true;
  return Boolean(profile?.permissions?.[capability]);
}

/* Tabs this profile may open, in the order the nav displays them. */
export const visibleTabs = (profile) => TABS.filter((tab) => canViewTab(profile, tab.id));
