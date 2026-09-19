/* ═══════════════════════════════════════════════════════════════════
   Sectioned Supabase storage.

   The app works with one `data` object. Postgres stores it as separate
   rows so row level security can gate each part independently — a
   member without comp access is never sent the comp row at all.

   This module splits on save and reassembles on load. Nothing above it
   needs to know the data arrives in pieces.
   ══════════════════════════════════════════════════════════════════ */

import { supabase, ORG_ID } from "./supabase";

export const SECTIONS = ["meta", "streams", "people", "sales", "org", "comp", "history"] as const;
export type SectionName = (typeof SECTIONS)[number];

/* Compensation lives in its own per-member table, so a member can be
   shown their own record without receiving everyone else's. */
const PERSON_COMP_FIELDS = [
  "compType", "commissionPlanId", "overridePlanId", "eligibility", "compEffectiveDate",
];

/* Sections the current user could actually read. A section that RLS
   withheld must never be written back, or an empty object would
   overwrite data the user was not allowed to see. */
let readableSections = new Set<SectionName>();
let lastSaved: Partial<Record<SectionName, string>> = {};

function splitIntoSections(data) {
  return {
    meta: {
      companyName: data.companyName,
      companyGoal: data.companyGoal,
      activeWeekStart: data.activeWeekStart,
      bridge: data.ops?.bridge,
    },
    streams: { streams: data.streams || [] },
    people: {
      people: (data.people || []).map((person) => {
        const stripped = { ...person };
        PERSON_COMP_FIELDS.forEach((field) => delete stripped[field]);
        return stripped;
      }),
    },
    sales: { sales: data.ops?.sales || [] },
    org: {
      divisions: data.org?.divisions || [],
      teams: data.org?.teams || [],
      goals: data.org?.goals || {},
      version: data.org?.version,
    },
    comp: {
      commission: data.ops?.commission,
      commissionPlans: data.ops?.commissionPlans || [],
      overridePlans: data.ops?.overridePlans || [],
      companyBonus: data.ops?.companyBonus,
      bonusPools: data.ops?.bonusPools || [],
      version: data.ops?.version,
    },
    history: { weeks: data.history?.weeks || [] },
  } as Record<SectionName, any>;
}

/* A member on the 'own' comp level is not sent the comp section at all.
   my_comp() returns just the plans assigned to them, which is enough for
   the commission engine to show their own tier and nothing else. */
function compFromOwnRecord(ownComp) {
  if (!ownComp) return {};
  return {
    commission: ownComp.fallbackCommission || undefined,
    commissionPlans: ownComp.commissionPlan ? [ownComp.commissionPlan] : [],
    overridePlans: ownComp.overridePlan ? [ownComp.overridePlan] : [],
    bonusPools: [],
  };
}

function assembleFromSections(sections, memberComp, payouts, ownComp?) {
  const people = (sections.people?.people || []).map((person) => {
    const comp = memberComp.find((row) => row.member_id === person.id);
    if (!comp) return person;
    return {
      ...person,
      compType: comp.comp_type,
      commissionPlanId: comp.commission_plan_id,
      overridePlanId: comp.override_plan_id,
      eligibility: comp.eligibility,
      compEffectiveDate: comp.effective_date,
    };
  });

  const comp = sections.comp || compFromOwnRecord(ownComp);

  return {
    companyName: sections.meta?.companyName,
    companyGoal: sections.meta?.companyGoal,
    activeWeekStart: sections.meta?.activeWeekStart,
    streams: sections.streams?.streams,
    people,
    history: { weeks: sections.history?.weeks || [] },
    org: {
      divisions: sections.org?.divisions,
      teams: sections.org?.teams,
      goals: sections.org?.goals,
      version: sections.org?.version,
    },
    ops: {
      bridge: sections.meta?.bridge,
      commission: comp.commission,
      commissionPlans: comp.commissionPlans,
      overridePlans: comp.overridePlans,
      companyBonus: comp.companyBonus,
      bonusPools: comp.bonusPools,
      version: comp.version,
      sales: sections.sales?.sales,
      payouts: payouts.map((row) => ({
        id: row.id, memberId: row.member_id, date: row.date,
        amount: String(row.amount ?? ""), note: row.note || "",
      })),
    },
  };
}

/* Strips keys whose value is undefined, so `migrate()` fills them from
   defaults instead of receiving an explicit undefined. */
function pruneUndefined(value) {
  if (Array.isArray(value)) return value;
  if (value === null || typeof value !== "object") return value;
  const result = {};
  Object.entries(value).forEach(([key, inner]) => {
    if (inner === undefined) return;
    result[key] = pruneUndefined(inner);
  });
  return result;
}

export async function loadDashboard() {
  const [sectionRows, compRows, payoutRows] = await Promise.all([
    supabase.from("dashboard_sections").select("section, data").eq("org_id", ORG_ID),
    supabase.from("member_comp").select("*").eq("org_id", ORG_ID),
    supabase.from("payouts").select("*").eq("org_id", ORG_ID),
  ]);

  if (sectionRows.error) throw sectionRows.error;

  const sections = {};
  readableSections = new Set();
  lastSaved = {};

  (sectionRows.data || []).forEach((row) => {
    sections[row.section] = row.data || {};
    readableSections.add(row.section as SectionName);
  });

  /* Without the comp section, fall back to this member's own record. */
  let ownComp = null;
  if (!readableSections.has("comp")) {
    const { data } = await supabase.rpc("my_comp");
    ownComp = data || null;
  }

  const assembled = assembleFromSections(
    sections, compRows.data || [], payoutRows.data || [], ownComp);

  return pruneUndefined(assembled);
}

/* Records the current state as "already saved".

   Call this once after migrate() has filled in defaults. Without it the
   first comparison is against the raw server rows, so the defaults that
   migrate() adds look like unsaved edits and provoke a write on load —
   which a read-only member is then refused, showing a save error they
   did nothing to cause. */
export function markAsSaved(data) {
  const split = splitIntoSections(data);
  readableSections.forEach((section) => {
    lastSaved[section] = JSON.stringify(split[section]);
  });
}

export async function saveDashboard(data) {
  const split = splitIntoSections(data);
  const changed = SECTIONS.filter((section) => {
    if (!readableSections.has(section)) return false;   // never overwrite what we could not read
    return JSON.stringify(split[section]) !== lastSaved[section];
  });

  const rejected: string[] = [];

  if (changed.length) {
    const { error } = await supabase.from("dashboard_sections").upsert(
      changed.map((section) => ({ org_id: ORG_ID, section, data: split[section] })),
      { onConflict: "org_id,section" });

    if (error) rejected.push(...changed);
    else changed.forEach((section) => { lastSaved[section] = JSON.stringify(split[section]); });
  }

  await saveMemberComp(data, rejected);
  await savePayouts(data, rejected);

  return rejected;
}

async function saveMemberComp(data, rejected: string[]) {
  const rows = (data.people || [])
    .filter((person) => person.id)
    .map((person) => ({
      org_id: ORG_ID,
      member_id: person.id,
      comp_type: person.compType || "Commission Only",
      commission_plan_id: person.commissionPlanId || "",
      override_plan_id: person.overridePlanId || "",
      eligibility: person.eligibility || {},
      effective_date: person.compEffectiveDate || "",
    }));

  if (!rows.length) return;
  const { error } = await supabase.from("member_comp")
    .upsert(rows, { onConflict: "org_id,member_id" });
  if (error) rejected.push("comp");
}

async function savePayouts(data, rejected: string[]) {
  const payouts = data.ops?.payouts || [];
  const rows = payouts.map((payout) => ({
    id: payout.id,
    org_id: ORG_ID,
    member_id: payout.memberId || "",
    date: payout.date || "",
    amount: Number(payout.amount) || 0,
    note: payout.note || "",
  }));

  if (rows.length) {
    const { error } = await supabase.from("payouts").upsert(rows, { onConflict: "id" });
    if (error) { rejected.push("payouts"); return; }
  }

  /* Remove payouts deleted in the UI. */
  const keptIds = rows.map((row) => row.id);
  const remove = supabase.from("payouts").delete().eq("org_id", ORG_ID);
  const { error } = keptIds.length
    ? await remove.not("id", "in", `(${keptIds.map((id) => `"${id}"`).join(",")})`)
    : await remove;
  if (error) rejected.push("payouts");
}
