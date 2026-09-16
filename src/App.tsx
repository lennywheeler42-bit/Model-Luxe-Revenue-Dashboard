/* ═════════════════════════════════════════════════════════════════════
   MODEL LUXE MEDIA — REVENUE DASHBOARD
   Stage 1 · Revenue · Team · Sales Ledger · Commissions · Charts

   Data flow (single direction):
     Streams (price)  ──┐
     Team tab (units) ──┴─► derived team sales ─┐
     Sales Ledger (manual sales) ───────────────┴─► commission engine ─► tiers
   ══════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { APP_CSS } from "./styles";

/* ═══════════════════════════════════════════════ DIVISIONS & CATALOG ══ */

const DIVISIONS = [
  "42 Model Management",
  "Model Way Academy",
  "Luxe Productions",
  "Expos & Conventions",
  "Other / Custom",
];

const DIV_COLOR = {
  "42 Model Management": "#B8860B",
  "Model Way Academy":   "#6B4FA8",
  "Luxe Productions":    "#2F6B4F",
  "Expos & Conventions": "#8A2E2E",
  "Other / Custom":      "#6b6257",
};

/* Seed divisions. These are the starting records only — divisions are
   editable data, not a fixed list, so the company can add or archive them
   without a code change. legacyName maps a stream's free-text division onto
   a division id so team-entered sales land in the right bucket. */
const SEED_DIVISIONS = [
  { id: "mgmt",        name: "42 Model Management",         legacyName: "42 Model Management",   color: "#B8860B" },
  { id: "academy",     name: "The Model Way Academy",       legacyName: "Model Way Academy",     color: "#6B4FA8" },
  { id: "podcast",     name: "The Model Way Podcast",       legacyName: "The Model Way Podcast", color: "#2B5C8A" },
  { id: "productions", name: "Model Luxe Productions",      legacyName: "Luxe Productions",      color: "#2F6B4F" },
  { id: "events",      name: "Model Luxe Conventions / Expos", legacyName: "Expos & Conventions", color: "#8A2E2E" },
];

const DEPARTMENTS = [
  "Sales", "Operations", "Marketing", "CRM", "Technology / Web",
  "Finance", "Production", "Management", "Administration",
];

/* Roles exist so leader dashboards and permissions have something to read
   later. Nothing is gated on them yet. */
const ROLES = [
  "CEO_ADMIN", "DIVISION_LEADER", "TEAM_LEADER", "SALES_REP",
  "OPERATIONS", "MARKETING", "CRM", "TECH", "FINANCE", "PRODUCTION", "TEAM_MEMBER",
];

const COMP_TYPES = [
  "VA / Contract", "Commission Only", "Salary",
  "Salary + Commission", "Salary + Bonus", "Salary + Commission + Bonus",
];

/* Division and team lookups read from live data, never from a constant. */
const divisionList  = (data, includeArchived = false) =>
  (data?.org?.divisions || []).filter((d) => includeArchived || !d.archived);
const teamList      = (data, includeArchived = false) =>
  (data?.org?.teams || []).filter((t) => includeArchived || !t.archived);
const divisionById  = (data, id) => (data?.org?.divisions || []).find((d) => d.id === id);
const teamById      = (data, id) => (data?.org?.teams || []).find((t) => t.id === id);
const divisionName  = (data, id) => divisionById(data, id)?.name || "Unassigned";
const divisionColor = (data, id) => divisionById(data, id)?.color || "#6b6257";
const teamName      = (data, id) => teamById(data, id)?.name || "Unassigned";
const teamsInDivision = (data, divisionId, includeArchived = false) =>
  teamList(data, includeArchived).filter((t) => t.divisionId === divisionId);
const membersInTeam = (data, teamId) => (data?.people || []).filter((p) => p.teamId === teamId);
const membersInDivision = (data, divisionId) => {
  const ids = new Set(teamsInDivision(data, divisionId, true).map((t) => t.id));
  return (data?.people || []).filter((p) => p.divisionId === divisionId || ids.has(p.teamId));
};

const divisionIdFromLegacy = (data, legacy) => {
  const list = data?.org?.divisions || SEED_DIVISIONS;
  const hit = list.find((d) => d.legacyName === legacy || d.name === legacy);
  return hit?.id || list[0]?.id || "mgmt";
};

const blankDivision = (name = "") => ({
  id: uid(),
  name,
  legacyName: "",
  color: "#6b6257",
  leaderId: "",
  archived: false,
  notes: "",
});

const blankTeam = (divisionId = "", name = "") => ({
  id: uid(),
  name,
  divisionId,
  leaderId: "",
  archived: false,
  notes: "",
});

const REVENUE_TYPES = ["one-time", "recurring", "commission"];

const CATALOG = [
  {
    division: "42 Model Management",
    items: [
      { name: "New Talent Onboarding",     prices: [275, 195, 395], type: "one-time" },
      { name: "Website Recurring Revenue", prices: [12, 15, 20, 25], type: "recurring" },
      { name: "Annual Agency Fee",         prices: [180, 240, 360], type: "recurring" },
      { name: "Comp Card Design",          prices: [150, 200, 250], type: "one-time" },
      { name: "Talent Development Fee",    prices: [],              type: "one-time" },
      { name: "Mother-Agency Commission",  prices: [],              type: "commission" },
    ],
  },
  {
    division: "Model Way Academy",
    items: [
      { name: "Academy Package",                      prices: [695, 495, 995], type: "one-time" },
      { name: "4-Week Development Plan (10 hrs)",     prices: [],              type: "one-time" },
      { name: "Saturday Classes",                     prices: [75, 100, 125],  type: "one-time" },
      { name: "Model Way Intensive",                  prices: [695],           type: "one-time" },
      { name: "60-Day Foundation Program",            prices: [],              type: "one-time" },
      { name: "Three-Month Professional Development", prices: [],              type: "recurring" },
      { name: "Six-Month Career Accelerator",         prices: [],              type: "recurring" },
      { name: "Twelve-Month Elite Mentorship",        prices: [],              type: "recurring" },
      { name: "Private Coaching (per hr)",            prices: [150, 200, 250], type: "one-time" },
      { name: "Online Course",                        prices: [97, 197, 297],  type: "one-time" },
    ],
  },
  {
    division: "Luxe Productions",
    items: [
      { name: "Photography",          prices: [350, 500, 750, 1000], type: "one-time" },
      { name: "Video / Reel Package", prices: [500, 750, 1200],      type: "one-time" },
      { name: "Headshot Session",     prices: [200, 300, 450],       type: "one-time" },
      { name: "Commercial Package",   prices: [1500, 2500, 3500],    type: "one-time" },
    ],
  },
  {
    division: "Expos & Conventions",
    items: [
      { name: "Expo Revenue",            prices: [],               type: "one-time" },
      { name: "Expo Package — Standard", prices: [695, 495],       type: "one-time" },
      { name: "Expo Package — Premium",  prices: [995, 795, 1195], type: "one-time" },
      { name: "Convention Bundle",       prices: [895, 1195],      type: "one-time" },
    ],
  },
  {
    division: "Other / Custom",
    items: [
      { name: "Sponsorship",          prices: [500, 1000, 2500, 5000], type: "one-time" },
      { name: "Podcast Ad Placement", prices: [250, 500, 1000],        type: "one-time" },
      { name: "Custom Service",       prices: [],                      type: "one-time" },
    ],
  },
];

const STARTER: any[] = [
  ["New Talent Onboarding",     "42 Model Management", [275, 195, 395],       "one-time"],
  ["Academy Package",           "Model Way Academy",   [695, 495, 995],       "one-time"],
  ["Saturday Classes",          "Model Way Academy",   [75, 100, 125],        "one-time"],
  ["Photography",               "Luxe Productions",    [350, 500, 750, 1000], "one-time"],
  ["Website Recurring Revenue", "42 Model Management", [12, 15, 20, 25],      "recurring"],
  ["Expo Revenue",              "Expos & Conventions", [],                    "one-time"],
];

/* ═══════════════════════════════════════════════════════════ HELPERS ══ */

const KEY = "mlm-calc-v7";
const uid = () => Math.random().toString(36).slice(2, 10);
const n   = (v) => (v === "" || v == null || isNaN(+v) ? 0 : +v);
const $$  = (v) => "$" + n(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
const $$c = (v) =>
  "$" + n(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function safePct(numerator, denominator) {
  const d = n(denominator);
  if (d <= 0) return null;
  const p = (n(numerator) / d) * 100;
  return isFinite(p) ? p : null;
}

function pctText(v, digits = 1) {
  if (v == null || !isFinite(v)) return "—";
  if (v > 9999) return ">9999%";
  return v.toFixed(digits) + "%";
}

function pctChange(current, previous) {
  const p = n(previous);
  if (p <= 0) return null;
  const c = ((n(current) - p) / p) * 100;
  return isFinite(c) ? c : null;
}

function changeText(v) {
  if (v === null) return "—";
  const sign = v >= 0 ? "+" : "";
  if (Math.abs(v) > 9999) return v >= 0 ? ">+9999%" : "<-9999%";
  return sign + v.toFixed(1) + "%";
}

const barWidth = (v) => (v === null ? 0 : Math.max(0, Math.min(100, v)));

/* ── dates ─────────────────────────────────────────────────────────── */

const MONTHS_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const pad2   = (x) => String(x).padStart(2, "0");
const isoD   = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseD = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, k) => { const x = new Date(d); x.setDate(x.getDate() + k); return x; };
const today0 = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };

function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function isoWeekNum(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7));
  const jan4 = new Date(x.getFullYear(), 0, 4);
  return 1 + Math.round(((+x - +jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}

const quarterOf = (month) => Math.floor(month / 3) + 1;

function periodRange(type, offset, today) {
  if (type === "week") {
    const s = addDays(startOfWeek(today), -7 * offset);
    return { start: s, end: addDays(s, 6) };
  }
  if (type === "month") {
    const s = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    return { start: s, end: new Date(s.getFullYear(), s.getMonth() + 1, 0) };
  }
  if (type === "quarter") {
    const q = Math.floor(today.getMonth() / 3) * 3;
    const s = new Date(today.getFullYear(), q - 3 * offset, 1);
    return { start: s, end: new Date(s.getFullYear(), s.getMonth() + 3, 0) };
  }
  const s = new Date(today.getFullYear() - offset, 0, 1);
  return { start: s, end: new Date(s.getFullYear(), 11, 31) };
}

function periodLabel(type, offset, today) {
  const { start, end } = periodRange(type, offset, today);
  if (type === "week")
    return `Week ${isoWeekNum(start)} · ${MONTHS_S[start.getMonth()]} ${start.getDate()}–${MONTHS_S[end.getMonth()]} ${end.getDate()}`;
  if (type === "month")  return `${MONTHS_S[start.getMonth()]} ${start.getFullYear()}`;
  if (type === "quarter") return `Q${quarterOf(start.getMonth())} ${start.getFullYear()}`;
  return String(start.getFullYear());
}

const PERIOD_NOUN = { week: "Week", month: "Month", quarter: "Quarter", year: "Year" };

/* Commission reset windows (month or quarter). */
function commissionWindow(dateISO, resetPeriod) {
  const d = parseD(dateISO);
  if (resetPeriod === "quarter") {
    const s = new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
    return {
      key: `${s.getFullYear()}-Q${Math.floor(s.getMonth() / 3) + 1}`,
      label: `Q${Math.floor(s.getMonth() / 3) + 1} ${s.getFullYear()}`,
      start: isoD(s),
      end: isoD(new Date(s.getFullYear(), s.getMonth() + 3, 0)),
    };
  }
  const s = new Date(d.getFullYear(), d.getMonth(), 1);
  return {
    key: isoD(s).slice(0, 7),
    label: `${MONTHS_S[s.getMonth()]} ${s.getFullYear()}`,
    start: isoD(s),
    end: isoD(new Date(s.getFullYear(), s.getMonth() + 1, 0)),
  };
}

const inWindow = (dateISO, w) => !!dateISO && dateISO >= w.start && dateISO <= w.end;

function monthKeyWindow(monthKey) {
  const [y, m] = String(monthKey).split("-").map(Number);
  const s = new Date(y, (m || 1) - 1, 1);
  return {
    key: monthKey,
    label: `${MONTHS_S[s.getMonth()]} ${s.getFullYear()}`,
    start: isoD(s),
    end: isoD(new Date(s.getFullYear(), s.getMonth() + 1, 0)),
  };
}

/* ═══════════════════════════════════════════════════ DATA STRUCTURES ══ */

const blankStream = (name = "", prices = [], division = "Other / Custom", revenueType = "one-time") => ({
  id: uid(),
  name,
  catalogPrices: prices,
  priceMode: prices.length ? "catalog" : "custom",
  selectedPrice: prices.length ? String(prices[0]) : "",
  customPrice: "",
  division,
  revenueType,
  companyGoal: "",
  houseQty: "",
});

const blankPerson = () => ({
  id: uid(),
  name: "",
  role: "",                 // free-text job title, e.g. "Sales"
  contacted: "", conversations: "", offers: "", dealsClosed: "",
  weeklyGoal: "",
  lines: {},                // streamId → { qty }

  /* org placement — a person has ONE record and moves between teams */
  divisionId: "",
  teamId: "",
  department: "Sales",
  systemRole: "TEAM_MEMBER",
  active: true,
  startDate: "",
  notes: "",

  divisionIds: [],          // legacy multi-division eligibility, kept
  external: { contactId: "" },

  /* compensation — plans are assigned, never hard-coded to a person */
  compType: "Commission Only",
  commissionPlanId: "",
  overridePlanId: "",
  eligibility: {
    commission: true,
    override: false,
    companyBonus: true,
    kpiBonus: false,
    teamPool: false,
  },
  compEffectiveDate: "",
});

const blankSale = (over = {}) => ({
  id: uid(),
  source: "manual",
  external: { contactId: "", opportunityId: "", pipelineStage: "" },
  clientName: "",
  divisionId: "mgmt",
  product: "",
  streamId: "",
  saleAmount: "",
  dateSold: isoD(today0()),
  commissionable: false,
  credits: [],            // [{ memberId, share }]
  payments: [],           // [{ id, date, amount }]
  notes: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...over,
});

const blankPayment = (amount = "", date = isoD(today0())) => ({ id: uid(), date, amount });
const blankPayout  = (memberId = "") => ({ id: uid(), memberId, date: isoD(today0()), amount: "", note: "" });
const blankBonusPool = (monthKey) => ({
  id: uid(),
  monthKey,
  revenueGoal: "",
  poolAmount: "1000",
  triggerPct: "100",
  eligibleMemberIds: [],
  decision: "",
});

const defaultCommission = () => ({
  tiers: [
    { id: "t1", name: "Tier 1", rate: 3, minCollected: "0" },
    { id: "t2", name: "Tier 2", rate: 5, minCollected: "" },
    { id: "t3", name: "Tier 3", rate: 7, minCollected: "" },
  ],
  mode: "marginal",
  resetPeriod: "month",
  clawbackRefunds: true,
});

/* ── commission plans ───────────────────────────────────────────────
   A plan is a reusable record assigned to people. Nobody's compensation
   is hard-coded to their name.                                       */

const blankTier = (name = "New tier", rate = 0) => ({
  id: uid(), name, rate, minCollected: "", enabled: true,
});

const blankCommissionPlan = (name = "New plan") => ({
  id: uid(),
  name,
  tiers: [{ ...blankTier("Tier 1", 0), minCollected: "0" }],
  mode: "marginal",            // marginal | flat
  resetPeriod: "month",
  clawbackRefunds: true,
  effectiveDate: "",
  notes: "",
});

const SEED_COMMISSION_PLANS = () => [
  {
    ...blankCommissionPlan("Sales Producer — Accelerator"),
    id: "plan-accelerator",
    tiers: [
      { id: "a1", name: "Base",   rate: 8,  minCollected: "0",    enabled: true },
      { id: "a2", name: "Second", rate: 10, minCollected: "3000", enabled: true },
      { id: "a3", name: "Top",    rate: 12, minCollected: "7000", enabled: true },
    ],
    mode: "marginal",
    notes: "Progressive: each band pays its own rate, so there is no cliff at a threshold.",
  },
  {
    ...blankCommissionPlan("Standard Sales"),
    id: "plan-standard",
    tiers: [
      { id: "s1", name: "Tier 1", rate: 3, minCollected: "0",     enabled: true },
      { id: "s2", name: "Tier 2", rate: 5, minCollected: "5000",  enabled: true },
      { id: "s3", name: "Tier 3", rate: 7, minCollected: "10000", enabled: true },
    ],
    mode: "marginal",
  },
];

/* ── leadership override plans ──────────────────────────────────── */

const blankOverridePlan = (name = "New override plan") => ({
  id: uid(),
  name,
  enabled: true,
  rate: 2,
  excludeOwnSales: true,       // they already earn personal commission on those
  minTeamRevenue: "",
  minTeamGoalPct: "",
  aboveThresholdOnly: false,   // pay only on revenue above minTeamRevenue
  eligibleStreamIds: [],       // empty = all streams
  effectiveDate: "",
  notes: "",
});

const SEED_OVERRIDE_PLANS = () => [
  {
    ...blankOverridePlan("Sales Director Override"),
    id: "override-director",
    rate: 2,
    excludeOwnSales: true,
    notes: "Paid on commissionable collected revenue from people under this leader.",
  },
];

/* The bridge. Team-entered units become sale records so they reach the
   ledger, commissions and tiers. */
const defaultBridge = () => ({
  enabled: true,
  treatAsCollected: true,     // units count as collected cash immediately
  commissionableDefault: true,
});

const defaultOps = () => ({
  commission: defaultCommission(),    // fallback for anyone with no plan assigned
  commissionPlans: SEED_COMMISSION_PLANS(),
  overridePlans: SEED_OVERRIDE_PLANS(),
  bridge: defaultBridge(),
  sales: [],
  payouts: [],
  bonusPools: [],
  version: 3,
});

/* Org: divisions, teams, and monthly goal allocation down the tree.
   Weekly goals on the Revenue tab are untouched — this is the monthly
   planning layer that the compensation periods run on. */
const defaultOrg = () => ({
  divisions: SEED_DIVISIONS.map((d) => ({ ...blankDivision(), ...d })),
  teams: [],
  goals: {},              // monthKey → { company, divisions{}, teams{}, members{} }
  version: 1,
});

const blankGoalPeriod = () => ({ company: "", divisions: {}, teams: {}, members: {} });

const defaultData = () => ({
  companyName: "Model Luxe Media",
  companyGoal: "",
  activeWeekStart: isoD(startOfWeek(new Date())),
  streams: STARTER.map(([nm, div, px, ty]) => blankStream(nm, px, div, ty)),
  people: [],
  history: { weeks: [] },
  org: defaultOrg(),
  ops: defaultOps(),
});

/* ══════════════════════════════════════════════════════ CALCULATIONS ══ */

const effPrice = (s) => (s.priceMode === "custom" ? n(s.customPrice) : n(s.selectedPrice));
const lineQty  = (p, sid) => n(((p.lines || {})[sid] || {}).qty);

function calcStream(stream, people) {
  const price    = effPrice(stream);
  const teamQty  = people.reduce((s, p) => s + lineQty(p, stream.id), 0);
  const houseQty = n(stream.houseQty);
  const totalQty = teamQty + houseQty;
  const revenue  = price * totalQty;
  const goal     = n(stream.companyGoal);
  const salesReq = goal > 0 && price > 0 ? Math.ceil(goal / price) : null;

  return {
    price, teamQty, houseQty, totalQty, revenue, goal,
    pctOfGoal: safePct(revenue, goal),
    remaining: Math.max(0, goal - revenue),
    salesReq,
    salesLeft: salesReq !== null ? Math.max(0, salesReq - totalQty) : null,
  };
}

function calcPerson(person, streams) {
  const revenue = streams.reduce((s, st) => s + effPrice(st) * lineQty(person, st.id), 0);
  const units   = streams.reduce((s, st) => s + lineQty(person, st.id), 0);

  const contacted     = n(person.contacted);
  const conversations = n(person.conversations);
  const offers        = n(person.offers);
  const deals         = n(person.dealsClosed);
  const goal          = n(person.weeklyGoal);

  return {
    revenue, units, contacted, conversations, offers, deals, goal,
    contactToConvo: safePct(conversations, contacted),
    convoToOffer:   safePct(offers, conversations),
    offerToClose:   safePct(deals, offers),
    overallClose:   safePct(deals, contacted),
    avgTransaction: deals > 0 ? revenue / deals : null,
    pctOfGoal:      safePct(revenue, goal),
    remaining:      Math.max(0, goal - revenue),
  };
}

/* ═══════════════════════════════════════════ THE TEAM → SALES BRIDGE ══

   A team member entering units on the Team tab is making a sale. This
   turns each of those unit lines into a real sale record so it shows up
   in the ledger, earns commission, and counts toward the tiers.

   Rules:
     · One derived sale per person · stream · week.
     · Credit goes 100% to the person who entered the units.
     · Division comes from the stream, so nothing needs re-tagging.
     · A manual ledger sale linked to the same person/stream/week
       SUPPRESSES the derived one — that is the double-count guard.
     · Derived sales are read-only in the ledger. Editing one means
       converting it to a manual record (which then suppresses it).
   ═══════════════════════════════════════════════════════════════════ */

const teamSaleKey = (weekStart, personId, streamId) => `tm:${weekStart}:${personId}:${streamId}`;

function makeTeamSale({ key, weekStart, person, streamName, streamId, divisionId, price, qty, bridge }) {
  const amount = price * qty;
  return {
    id: key,
    source: "team",
    derived: true,
    teamKey: key,
    external: { contactId: "", opportunityId: "", pipelineStage: "" },
    clientName: `${person.name || "Unnamed"} · week of ${weekStart}`,
    divisionId,
    product: streamName,
    streamId,
    saleAmount: String(amount),
    dateSold: weekStart,
    commissionable: !!bridge.commissionableDefault,
    credits: [{ memberId: person.id, share: 100 }],
    payments: bridge.treatAsCollected && amount > 0
      ? [{ id: `${key}:p`, date: weekStart, amount: String(amount) }]
      : [],
    notes: "Generated from Team tab units.",
    units: qty,
    createdAt: "", updatedAt: "",
  };
}

/* Derived sales for the active (open) week. */
function activeWeekTeamSales(data) {
  const bridge = data.ops?.bridge || defaultBridge();
  if (!bridge.enabled) return [];
  const weekStart = data.activeWeekStart || isoD(startOfWeek(new Date()));
  const out = [];
  (data.people || []).forEach((person) => {
    (data.streams || []).forEach((stream) => {
      const qty = lineQty(person, stream.id);
      if (qty <= 0) return;
      const price = effPrice(stream);
      if (price <= 0) return;
      out.push(makeTeamSale({
        key: teamSaleKey(weekStart, person.id, stream.id),
        weekStart, person,
        streamName: stream.name || "Unnamed stream",
        streamId: stream.id,
        divisionId: divisionIdFromLegacy(data, stream.division),
        price, qty, bridge,
      }));
    });
  });
  return out;
}

/* Derived sales for every closed week, read out of the snapshots so that
   monthly tier math sees the whole month, not just the open week. */
function historyTeamSales(data) {
  const bridge = data.ops?.bridge || defaultBridge();
  if (!bridge.enabled) return [];
  const out = [];
  (data.history?.weeks || []).forEach((wk) => {
    const streamById = {};
    (wk.streams || []).forEach((s) => { streamById[s.id] = s; });
    (wk.people || []).forEach((snapPerson) => {
      Object.entries(snapPerson.lines || {}).forEach(([streamId, qty]) => {
        const q = n(qty);
        const st = streamById[streamId];
        if (q <= 0 || !st) return;
        const price = n(st.price);
        if (price <= 0) return;
        out.push(makeTeamSale({
          key: teamSaleKey(wk.weekStart, snapPerson.id, streamId),
          weekStart: wk.weekStart,
          person: { id: snapPerson.id, name: snapPerson.name },
          streamName: st.name || "Unnamed stream",
          streamId,
          divisionId: divisionIdFromLegacy(data, st.division),
          price, qty: q, bridge,
        }));
      });
    });
  });
  return out;
}

/* Every sale the commission engine should see: manual ledger records plus
   derived team sales, with derived ones suppressed where a manual record
   has claimed the same person/stream/week. */
function allSales(data) {
  const manual = data.ops?.sales || [];
  const claimed = new Set(manual.map((s) => s.teamKey).filter(Boolean));
  const derived = [...historyTeamSales(data), ...activeWeekTeamSales(data)]
    .filter((s) => !claimed.has(s.teamKey));
  return [...manual, ...derived];
}

/* Convert a derived sale into a real editable ledger record. */
function promoteTeamSale(sale) {
  return {
    ...blankSale(),
    ...sale,
    id: uid(),
    source: "team-converted",
    derived: false,
    notes: "Converted from a Team tab entry.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════ ONE-TRANSACTION ROLLUP ══

   Every level reads the SAME sale records. A $5,000 sale is entered once
   and appears in the seller's number, their team's, their division's and
   the company's — it is never re-entered or double-counted.

   Which bucket a sale lands in:
     · person   — the credit split on the sale
     · team     — the team each credited person belongs to
     · division — the sale's own division (the product sold), which can
                  differ from the seller's home division when someone sells
                  across the business
   ══════════════════════════════════════════════════════════════════════ */

const saleBooked = (sale) => n(sale.saleAmount);

function salesInWindow(sales, window) {
  return (sales || []).filter((s) => inWindow(s.dateSold, window));
}

/* One pass over the ledger producing every level of the rollup. */
function rollup(data, window) {
  const sales = salesInWindow(allSales(data), window);
  const people = data.people || [];
  const personById = Object.fromEntries(people.map((p) => [p.id, p]));

  const blank = () => ({ booked: 0, collected: 0, outstanding: 0, sales: 0, recurring: 0, oneTime: 0 });
  const company = blank();
  const byPerson = {}, byTeam = {}, byDivision = {};

  const streamById = Object.fromEntries((data.streams || []).map((s) => [s.id, s]));
  const isRecurring = (sale) => (streamById[sale.streamId]?.revenueType || "one-time") === "recurring";

  sales.forEach((sale) => {
    const booked = saleBooked(sale);
    const collected = saleCollected(sale);
    const outstanding = saleOutstanding(sale);
    const recurring = isRecurring(sale);

    const add = (bucket) => {
      bucket.booked += booked;
      bucket.collected += collected;
      bucket.outstanding += outstanding;
      bucket.sales += 1;
      if (recurring) bucket.recurring += booked; else bucket.oneTime += booked;
    };

    add(company);

    /* division — follows the product sold */
    const divId = sale.divisionId || "";
    byDivision[divId] = byDivision[divId] || blank();
    add(byDivision[divId]);

    /* person and team — follow the credit split */
    const credits = saleCredits(sale);
    if (!credits.length) return;

    const seenTeams = new Set();
    credits.forEach((credit) => {
      const share = credit.share / 100;
      const person = personById[credit.memberId];

      byPerson[credit.memberId] = byPerson[credit.memberId] || blank();
      const pb = byPerson[credit.memberId];
      pb.booked += booked * share;
      pb.collected += collected * share;
      pb.outstanding += outstanding * share;
      pb.sales += share;
      if (recurring) pb.recurring += booked * share; else pb.oneTime += booked * share;

      const teamId = person?.teamId;
      if (!teamId) return;
      byTeam[teamId] = byTeam[teamId] || blank();
      const tb = byTeam[teamId];
      tb.booked += booked * share;
      tb.collected += collected * share;
      tb.outstanding += outstanding * share;
      if (recurring) tb.recurring += booked * share; else tb.oneTime += booked * share;
      /* count a split sale once per team, not once per creditee */
      if (!seenTeams.has(teamId)) { tb.sales += 1; seenTeams.add(teamId); }
    });
  });

  return { window, company, byPerson, byTeam, byDivision, sales };
}

/* ═══════════════════════════════════════════════════ GOAL ALLOCATION ══ */

const goalPeriod = (data, monthKey) => ({ ...blankGoalPeriod(), ...((data.org?.goals || {})[monthKey] || {}) });

function allocation(data, monthKey) {
  const period = goalPeriod(data, monthKey);
  const companyGoal = n(period.company);

  const divisions = divisionList(data).map((d) => {
    const goal = n(period.divisions?.[d.id]);
    const teams = teamsInDivision(data, d.id).map((t) => {
      const teamGoal = n(period.teams?.[t.id]);
      const members = membersInTeam(data, t.id).map((m) => ({
        member: m, goal: n(period.members?.[m.id]),
      }));
      const allocatedToMembers = members.reduce((s, m) => s + m.goal, 0);
      return {
        team: t, goal: teamGoal, members,
        allocated: allocatedToMembers,
        unallocated: teamGoal - allocatedToMembers,
      };
    });
    const allocatedToTeams = teams.reduce((s, t) => s + t.goal, 0);
    return {
      division: d, goal, teams,
      allocated: allocatedToTeams,
      unallocated: goal - allocatedToTeams,
    };
  });

  const allocatedToDivisions = divisions.reduce((s, d) => s + d.goal, 0);

  return {
    monthKey,
    companyGoal,
    divisions,
    allocated: allocatedToDivisions,
    unallocated: companyGoal - allocatedToDivisions,
  };
}

/* ══════════════════════════════════════════════ COMMISSION ENGINE ══ */

/* ── plan resolution ────────────────────────────────────────────────
   Every calculation asks which plan applies to this person. Nothing
   reads a global rate.                                              */

const commissionPlans = (data) => data.ops?.commissionPlans || [];
const overridePlans   = (data) => data.ops?.overridePlans || [];

function planFor(data, memberId) {
  const person = (data.people || []).find((p) => p.id === memberId);
  const assigned = commissionPlans(data).find((pl) => pl.id === person?.commissionPlanId);
  /* unassigned people fall back to the legacy global config so nothing
     silently stops calculating during the transition */
  return assigned || { ...data.ops.commission, id: "", name: "Unassigned (default rates)" };
}

function overridePlanFor(data, memberId) {
  const person = (data.people || []).find((p) => p.id === memberId);
  if (!person?.eligibility?.override) return null;
  return overridePlans(data).find((pl) => pl.id === person?.overridePlanId) || null;
}

const earnsCommission = (data, memberId) => {
  const person = (data.people || []).find((p) => p.id === memberId);
  return person?.eligibility?.commission !== false;
};

/* Tiers become usable only once a threshold is filled in and the tier is
   enabled. Tier 1 always counts and always starts at 0. */
function usableTiers(commission) {
  return (commission.tiers || [])
    .filter((t) => t.enabled !== false)
    .filter((t, i) => i === 0 || String(t.minCollected).trim() !== "")
    .map((t, i) => ({
      ...t,
      min:  i === 0 ? Math.max(0, n(t.minCollected)) : n(t.minCollected),
      rate: n(t.rate),
    }))
    .sort((a, b) => a.min - b.min);
}

/* Normalised credit splits — never pays out more than 100% of a sale. */
function saleCredits(sale) {
  const credits = (sale.credits || []).filter((c) => c.memberId);
  if (!credits.length) return [];
  const total = credits.reduce((s, c) => s + n(c.share), 0);
  const scale = total > 100 ? 100 / total : 1;
  return credits.map((c) => ({ memberId: c.memberId, share: n(c.share) * scale }));
}

function commissionOn(base, commission) {
  const tiers = usableTiers(commission);
  const amount = Math.max(0, base);
  if (!tiers.length || amount <= tiers[0].min) return { commission: 0, tier: null, effectiveRate: 0 };

  let tier = tiers[0];
  tiers.forEach((t) => { if (amount >= t.min) tier = t; });

  let total = 0;
  if (commission.mode === "flat") {
    total = amount * (tier.rate / 100);
  } else {
    tiers.forEach((t, i) => {
      const ceiling = i + 1 < tiers.length ? tiers[i + 1].min : Infinity;
      const slice = Math.max(0, Math.min(amount, ceiling) - t.min);
      total += slice * (t.rate / 100);
    });
  }
  return { commission: total, tier, effectiveRate: amount > 0 ? (total / amount) * 100 : 0 };
}

function tierProgress(base, commission) {
  const tiers = usableTiers(commission);
  const { commission: earned, tier, effectiveRate } = commissionOn(base, commission);
  const belowFirst = !tier && tiers.length && base < tiers[0].min;
  const current = belowFirst ? null : tier || tiers[0] || null;
  const idx = current ? tiers.findIndex((t) => t.id === current.id) : -1;
  const next = belowFirst ? tiers[0] : idx >= 0 && idx + 1 < tiers.length ? tiers[idx + 1] : null;
  const unsetTiers = (commission.tiers || []).filter((t, i) => i > 0 && String(t.minCollected).trim() === "");

  return {
    current, next,
    commission: earned,
    effectiveRate,
    needed: next ? Math.max(0, next.min - base) : 0,
    pctToNext: next && next.min > 0 ? Math.min(100, (base / next.min) * 100) : 100,
    commissionAtNext: next ? commissionOn(next.min, commission).commission : null,
    unsetTiers,
  };
}

/* Collected, commissionable dollars credited to one member in one window. */
function memberBase(sales, memberId, window, commission) {
  let total = 0;
  sales.forEach((sale) => {
    if (!sale.commissionable) return;
    const credit = saleCredits(sale).find((c) => c.memberId === memberId);
    if (!credit) return;
    (sale.payments || []).forEach((p) => {
      if (!inWindow(p.date, window)) return;
      const amt = n(p.amount);
      if (amt < 0 && !commission.clawbackRefunds) return;
      total += amt * (credit.share / 100);
    });
  });
  return total;
}

/* Every window in which a member collected anything. */
function memberWindows(sales, memberId, commission) {
  const seen = {};
  sales.forEach((sale) => {
    if (!sale.commissionable) return;
    if (!saleCredits(sale).some((c) => c.memberId === memberId)) return;
    (sale.payments || []).forEach((p) => {
      if (!p.date) return;
      const w = commissionWindow(p.date, commission.resetPeriod);
      seen[w.key] = w;
    });
  });
  return Object.values(seen).sort((a: any, b: any) => (a.start < b.start ? -1 : 1));
}

/* ═══════════════════════════════════════════════ LEADERSHIP OVERRIDE ══

   A leader earns a rate on commissionable collected revenue produced by
   the people under them. Their OWN sales are excluded by default — they
   already earn personal commission on those, and paying both is paying
   twice for one sale.
   ══════════════════════════════════════════════════════════════════ */

/* Everyone reporting to this leader: their team's members, plus every
   team in a division they lead. Never includes the leader. */
function membersUnder(data, leaderId) {
  const ids = new Set<string>();
  teamList(data, true).forEach((team) => {
    const leadsTeam = team.leaderId === leaderId;
    const division = divisionById(data, team.divisionId);
    const leadsDivision = division?.leaderId === leaderId;
    if (!leadsTeam && !leadsDivision) return;
    membersInTeam(data, team.id).forEach((m) => ids.add(m.id));
  });
  ids.delete(leaderId);
  return [...ids];
}

function overrideForMember(data, leaderId, window) {
  const plan = overridePlanFor(data, leaderId);
  if (!plan || !plan.enabled) return null;

  const commission = planFor(data, leaderId);
  const sales = allSales(data);
  const under = membersUnder(data, leaderId);
  const streamFilter = (plan.eligibleStreamIds || []);

  let eligible = 0;
  sales.forEach((sale) => {
    if (!sale.commissionable) return;
    if (streamFilter.length && !streamFilter.includes(sale.streamId)) return;

    saleCredits(sale).forEach((credit) => {
      const isOwn = credit.memberId === leaderId;
      if (isOwn && plan.excludeOwnSales) return;
      if (!isOwn && !under.includes(credit.memberId)) return;

      (sale.payments || []).forEach((p) => {
        if (!inWindow(p.date, window)) return;
        const amt = n(p.amount);
        if (amt < 0 && !commission.clawbackRefunds) return;
        eligible += amt * (credit.share / 100);
      });
    });
  });

  /* gates */
  const minRevenue = n(plan.minTeamRevenue);
  const teamGoalPct = null;   // wired to team goals in a later stage
  const meetsRevenue = minRevenue <= 0 || eligible >= minRevenue;
  const base = plan.aboveThresholdOnly ? Math.max(0, eligible - minRevenue) : eligible;
  const earned = meetsRevenue ? base * (n(plan.rate) / 100) : 0;

  return {
    plan,
    eligible,
    base,
    rate: n(plan.rate),
    earned,
    meetsRevenue,
    minRevenue,
    memberCount: under.length,
    excludedOwn: plan.excludeOwnSales,
  };
}

function memberSummary(data, memberId, today = new Date()) {
  const commission = planFor(data, memberId);
  const sales = allSales(data);

  const windows = memberWindows(sales, memberId, commission).map((w: any) => {
    const base = memberBase(sales, memberId, w, commission);
    return { ...w, base, ...commissionOn(base, commission) };
  });

  const earnedAllTime = windows.reduce((s, w) => s + w.commission, 0);
  const paid = (data.ops.payouts || [])
    .filter((p) => p.memberId === memberId)
    .reduce((s, p) => s + n(p.amount), 0);

  const currentWindow = commissionWindow(isoD(today), commission.resetPeriod);
  const currentBase = memberBase(sales, memberId, currentWindow, commission);
  const eligible = earnsCommission(data, memberId);
  const override = overrideForMember(data, memberId, currentWindow);

  const progress = tierProgress(currentBase, commission);
  if (!eligible) { progress.commission = 0; }

  return {
    windows,
    plan: commission,
    eligible,
    earnedAllTime: eligible ? earnedAllTime : 0,
    paid,
    owed: (eligible ? earnedAllTime : 0) - paid,
    currentWindow,
    currentBase,
    progress,
    override,
    totalIncentive: (eligible ? progress.commission : 0) + (override?.earned || 0),
  };
}

/* Per-sale commission preview, at each creditee's effective rate. */
function saleCommissionSplit(data, sale) {
  if (!sale.commissionable) return [];
  const sales = allSales(data);

  return saleCredits(sale).map((credit) => {
    const commission = planFor(data, credit.memberId);
    if (!earnsCommission(data, credit.memberId)) {
      return { memberId: credit.memberId, share: credit.share, credited: 0, commission: 0, rate: 0 };
    }
    const byWindow = {};
    (sale.payments || []).forEach((p) => {
      if (!p.date) return;
      const amt = n(p.amount);
      if (amt < 0 && !commission.clawbackRefunds) return;
      const w = commissionWindow(p.date, commission.resetPeriod);
      byWindow[w.key] = byWindow[w.key] || { w, amt: 0 };
      byWindow[w.key].amt += amt * (credit.share / 100);
    });

    let earned = 0, credited = 0;
    Object.values(byWindow).forEach(({ w, amt }: any) => {
      const base = memberBase(sales, credit.memberId, w, commission);
      const { effectiveRate } = commissionOn(base, commission);
      earned += amt * (effectiveRate / 100);
      credited += amt;
    });

    return {
      memberId: credit.memberId,
      share: credit.share,
      credited,
      commission: earned,
      rate: credited > 0 ? (earned / credited) * 100 : 0,
    };
  });
}

const saleCollected = (sale) => (sale.payments || []).reduce((s, p) => s + n(p.amount), 0);
const saleOutstanding = (sale) => Math.max(0, n(sale.saleAmount) - saleCollected(sale));

function collectedInWindow(sales, window) {
  return (sales || []).reduce((total, sale) => {
    return total + (sale.payments || []).reduce(
      (s, p) => s + (inWindow(p.date, window) ? n(p.amount) : 0), 0);
  }, 0);
}

/* ══════════════════════════════════════════════════════ TEAM BONUS ══ */

function bonusStatus(data, pool) {
  const sales = allSales(data);
  const actual = collectedInWindow(sales, monthKeyWindow(pool.monthKey));
  const goal = n(pool.revenueGoal);
  const pctAchieved = goal > 0 ? (actual / goal) * 100 : null;
  const trigger = n(pool.triggerPct) || 100;
  const targetHit = goal > 0 && pctAchieved >= trigger;
  const eligible = (pool.eligibleMemberIds || []).length;
  const perPerson = eligible > 0 ? n(pool.poolAmount) / eligible : 0;

  let status = "Not Earned";
  if (pool.decision === "Paid") status = "Paid";
  else if (pool.decision === "Approved") status = "Approved";
  else if (targetHit) status = "Pending Approval";

  return { actual, goal, pctAchieved, trigger, targetHit, eligible, perPerson, status };
}

function memberBonus(data, memberId) {
  let approved = 0, paid = 0;
  (data.ops.bonusPools || []).forEach((pool) => {
    if (!(pool.eligibleMemberIds || []).includes(memberId)) return;
    const s = bonusStatus(data, pool);
    if (s.status === "Approved") approved += s.perPerson;
    if (s.status === "Paid") paid += s.perPerson;
  });
  return { approved, paid, total: approved + paid };
}

/* ═══════════════════════════════════════════════════════ SNAPSHOTS ══ */

function buildSnapshot(data, weekStartISO) {
  const ws = parseD(weekStartISO);
  const we = addDays(ws, 6);

  const streams = data.streams.map((s) => {
    const c = calcStream(s, data.people);
    return {
      id: s.id,
      name: s.name,
      division: s.division || "Other / Custom",
      revenueType: s.revenueType || "one-time",
      price: c.price, goal: c.goal,
      units: c.totalQty, houseUnits: c.houseQty, teamUnits: c.teamQty,
      revenue: c.revenue,
    };
  });

  const people = data.people.map((p) => {
    const c = calcPerson(p, data.streams);
    return {
      id: p.id, name: p.name, role: p.role,
      contacted: c.contacted, conversations: c.conversations,
      offers: c.offers, deals: c.deals,
      units: c.units, revenue: c.revenue, goal: c.goal,
      lines: Object.fromEntries(
        data.streams.map((s) => [s.id, lineQty(p, s.id)]).filter(([, q]) => q > 0)),
    };
  });

  return {
    id: uid(),
    weekStart: weekStartISO,
    weekEnd: isoD(we),
    weekNumber: isoWeekNum(ws),
    month: ws.getMonth() + 1,
    quarter: quarterOf(ws.getMonth()),
    year: ws.getFullYear(),
    closedAt: new Date().toISOString(),
    companyGoal: n(data.companyGoal),
    streams, people,
  };
}

const activeSnapshot = (data) => ({
  ...buildSnapshot(data, data.activeWeekStart || isoD(startOfWeek(new Date()))),
  isActive: true,
});

const allWeekRecords = (data) =>
  [...(data.history?.weeks || []), activeSnapshot(data)]
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));

function weeksInRange(records, range) {
  const s = isoD(range.start), e = isoD(range.end);
  return records.filter((w) => w.weekStart >= s && w.weekStart <= e);
}

function aggregate(weeks) {
  const out: any = {
    weeks: weeks.length,
    revenue: 0, goal: 0, units: 0, deals: 0,
    contacted: 0, conversations: 0, offers: 0,
    recurring: 0, oneTime: 0, commission: 0,
    byStream: {}, byDivision: {}, byPerson: {},
  };

  weeks.forEach((w) => {
    out.goal += n(w.companyGoal);

    (w.streams || []).forEach((st) => {
      out.revenue += n(st.revenue);
      out.units += n(st.units);
      const type = st.revenueType || "one-time";
      if (type === "recurring") out.recurring += n(st.revenue);
      else if (type === "commission") out.commission += n(st.revenue);
      else out.oneTime += n(st.revenue);

      const sk = st.name || st.id;
      out.byStream[sk] = out.byStream[sk] || { name: sk, division: st.division, revenue: 0, goal: 0, units: 0 };
      out.byStream[sk].revenue += n(st.revenue);
      out.byStream[sk].goal += n(st.goal);
      out.byStream[sk].units += n(st.units);

      const dk = st.division || "Other / Custom";
      out.byDivision[dk] = out.byDivision[dk] || { name: dk, revenue: 0, goal: 0, units: 0 };
      out.byDivision[dk].revenue += n(st.revenue);
      out.byDivision[dk].goal += n(st.goal);
      out.byDivision[dk].units += n(st.units);
    });

    (w.people || []).forEach((p) => {
      out.contacted += n(p.contacted);
      out.conversations += n(p.conversations);
      out.offers += n(p.offers);
      out.deals += n(p.deals);

      const pk = p.name || p.id;
      out.byPerson[pk] = out.byPerson[pk] || {
        name: pk, role: p.role, revenue: 0, goal: 0, units: 0,
        deals: 0, contacted: 0, conversations: 0, offers: 0,
      };
      const rec = out.byPerson[pk];
      rec.revenue += n(p.revenue);
      rec.goal += n(p.goal);
      rec.units += n(p.units);
      rec.deals += n(p.deals);
      rec.contacted += n(p.contacted);
      rec.conversations += n(p.conversations);
      rec.offers += n(p.offers);
    });
  });

  out.pctOfGoal = safePct(out.revenue, out.goal);
  out.remaining = Math.max(0, out.goal - out.revenue);
  out.closeRate = safePct(out.deals, out.contacted);
  out.contactToConvo = safePct(out.conversations, out.contacted);
  out.convoToOffer = safePct(out.offers, out.conversations);
  out.offerToClose = safePct(out.deals, out.offers);
  out.avgTransaction = out.deals > 0 ? out.revenue / out.deals : null;
  out.recurringShare = safePct(out.recurring, out.revenue);
  return out;
}

function periodReport(data, type, offset, today) {
  const records = allWeekRecords(data);
  const cur  = aggregate(weeksInRange(records, periodRange(type, offset, today)));
  const prev = aggregate(weeksInRange(records, periodRange(type, offset + 1, today)));
  return {
    cur, prev,
    label: periodLabel(type, offset, today),
    prevLabel: periodLabel(type, offset + 1, today),
    range: periodRange(type, offset, today),
  };
}

/* ══════════════════════════════════════════════════ ATTENTION ITEMS ══ */

function attentionItems(data, rep, type) {
  const items: any[] = [];
  const { cur } = rep;

  if (cur.goal > 0 && cur.pctOfGoal !== null && cur.pctOfGoal < 70)
    items.push({ sev: "high", text: `${PERIOD_NOUN[type]} revenue is at ${pctText(cur.pctOfGoal)} of goal — ${$$(cur.remaining)} still to find.` });

  if (!data.people.length)
    items.push({ sev: "mid", text: "No team members yet. Add them on the Team tab so units and commission have somewhere to land." });

  data.streams.forEach((s) => {
    if (!s.name) items.push({ sev: "low", text: "A revenue stream has no name." });
    if (effPrice(s) <= 0 && s.name)
      items.push({ sev: "mid", text: `“${s.name}” has no price set, so its units are worth $0.` });
  });

  const commission = data.ops.commission;
  const unset = (commission.tiers || []).filter((t, i) => i > 0 && String(t.minCollected).trim() === "");
  if (unset.length)
    items.push({ sev: "mid", text: `${unset.length} commission tier${unset.length > 1 ? "s have" : " has"} no threshold set, so nobody can reach ${unset.length > 1 ? "them" : "it"}.` });

  const sales = allSales(data);
  const overCollected = sales.filter((s) => saleCollected(s) > n(s.saleAmount) + 0.5);
  if (overCollected.length)
    items.push({ sev: "high", text: `${overCollected.length} sale${overCollected.length > 1 ? "s have" : " has"} collected more than the sale amount.` });

  const uncredited = (data.ops.sales || []).filter((s) => s.commissionable && !saleCredits(s).length);
  if (uncredited.length)
    items.push({ sev: "mid", text: `${uncredited.length} commissionable sale${uncredited.length > 1 ? "s have" : " has"} nobody credited — no commission will be paid on ${uncredited.length > 1 ? "them" : "it"}.` });

  if (!data.ops.bridge?.enabled && data.people.some((p) => Object.keys(p.lines || {}).length))
    items.push({ sev: "high", text: "The Team → Sales bridge is off, so team-entered units are not reaching commissions or tiers." });

  return items.slice(0, 6);
}

/* ═════════════════════════════════════════════════════════ STORAGE ══ */

function loadSaved() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persist(data) {
  try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  return Promise.resolve();
}

function catalogLookup(name) {
  for (const group of CATALOG) {
    const item = group.items.find((i) => i.name === name);
    if (item) return { division: group.division, type: item.type };
  }
  return null;
}

function guessType(name = "") {
  const s = name.toLowerCase();
  if (s.includes("commission")) return "commission";
  if (s.includes("recurring") || s.includes("subscription") || s.includes("monthly") ||
      s.includes("website") || s.includes("mentorship") || s.includes("annual")) return "recurring";
  return "one-time";
}

/* ══════════════════════════════════════════════════════════ MIGRATE ══ */

function migrate(saved) {
  const base: any = { ...defaultData(), ...(saved || {}) };

  /* legacy expo block → a single house-quantity stream */
  if (Array.isArray(saved?.expos) && saved.expos.length) {
    const total = saved.expos.reduce(
      (sum, expo) => sum + (expo.packages || []).reduce((s, p) => s + n(p.price) * n(p.qtySold), 0), 0);
    if (total > 0) {
      const s = blankStream("Expo Revenue", [], "Expos & Conventions", "one-time");
      s.priceMode = "custom"; s.customPrice = "1"; s.houseQty = String(total);
      base.streams = [...(base.streams || []), s];
    }
  }
  delete base.expos;

  base.streams = (base.streams || []).map((s) => {
    const cat = s.name ? catalogLookup(s.name) : null;
    return {
      ...blankStream(), ...s,
      catalogPrices: Array.isArray(s.catalogPrices) ? s.catalogPrices : [],
      division: s.division || cat?.division || "Other / Custom",
      revenueType: s.revenueType || cat?.type || guessType(s.name),
    };
  });

  /* org namespace — divisions become editable records, teams are new */
  const savedOrg = saved?.org || {};
  const seeded = defaultOrg();
  base.org = {
    ...seeded,
    ...savedOrg,
    divisions: Array.isArray(savedOrg.divisions) && savedOrg.divisions.length
      ? savedOrg.divisions.map((d) => ({ ...blankDivision(), ...d }))
      : seeded.divisions,
    teams: Array.isArray(savedOrg.teams) ? savedOrg.teams.map((t) => ({ ...blankTeam(), ...t })) : [],
    goals: savedOrg.goals || {},
    version: 1,
  };

  base.people = (base.people || []).map((p) => {
    const person: any = { ...blankPerson(), ...p };
    person.dealsClosed = p.dealsClosed ?? p.salesClosed ?? "";
    delete person.salesClosed;
    person.lines = Object.fromEntries(
      Object.entries(p.lines || {}).map(([k, v]: any) => [k, { qty: v?.qty ?? "" }]));
    person.divisionIds = Array.isArray(p.divisionIds) ? p.divisionIds : [];
    person.external = { ...blankPerson().external, ...(p.external || {}) };

    /* place people who predate teams: keep them unassigned rather than
       guessing, but carry across a single legacy division if they had one */
    person.divisionId = p.divisionId || (person.divisionIds.length === 1 ? person.divisionIds[0] : "");
    person.teamId = p.teamId || "";
    person.department = p.department || "Sales";
    person.systemRole = p.systemRole || "TEAM_MEMBER";
    person.active = p.active === undefined ? true : !!p.active;
    person.startDate = p.startDate || "";
    person.notes = p.notes || "";

    person.compType = p.compType || "Commission Only";
    person.commissionPlanId = p.commissionPlanId || "";
    person.overridePlanId = p.overridePlanId || "";
    person.eligibility = { ...blankPerson().eligibility, ...(p.eligibility || {}) };
    person.compEffectiveDate = p.compEffectiveDate || "";
    return person;
  });

  /* a team whose division was deleted becomes unassigned rather than orphaned */
  const divIds = new Set(base.org.divisions.map((d) => d.id));
  base.org.teams = base.org.teams.map((t) => (divIds.has(t.divisionId) ? t : { ...t, divisionId: "" }));
  const teamIds = new Set(base.org.teams.map((t) => t.id));
  base.people = base.people.map((p) => (p.teamId && !teamIds.has(p.teamId) ? { ...p, teamId: "" } : p));

  const weeks = Array.isArray(saved?.history?.weeks) ? saved.history.weeks : [];
  base.history = {
    weeks: weeks.map((w) => {
      const ws = parseD(w.weekStart || isoD(startOfWeek(new Date())));
      return {
        ...w,
        id: w.id || uid(),
        weekEnd: w.weekEnd || isoD(addDays(ws, 6)),
        weekNumber: w.weekNumber ?? isoWeekNum(ws),
        month: w.month ?? ws.getMonth() + 1,
        quarter: w.quarter ?? quarterOf(ws.getMonth()),
        year: w.year ?? ws.getFullYear(),
        streams: (w.streams || []).map((s) => ({
          ...s,
          division: s.division || catalogLookup(s.name)?.division || "Other / Custom",
          revenueType: s.revenueType || catalogLookup(s.name)?.type || guessType(s.name),
        })),
        people: (w.people || []).map((p) => ({ ...p, deals: p.deals ?? p.sales ?? 0 })),
      };
    }),
  };

  base.activeWeekStart = isoD(startOfWeek(
    base.activeWeekStart ? parseD(base.activeWeekStart) : new Date()));

  /* ops namespace — commission, bridge, ledger */
  const savedOps = saved?.ops || {};
  const defaults = defaultOps();
  const commission = { ...defaults.commission, ...(savedOps.commission || {}) };
  commission.tiers =
    Array.isArray(savedOps.commission?.tiers) && savedOps.commission.tiers.length
      ? savedOps.commission.tiers.map((t, i) => ({ ...defaults.commission.tiers[i], ...t }))
      : defaults.commission.tiers;

  /* Commission plans. A workspace that predates plans keeps its existing
     tiers as a real plan, so nobody's numbers change under them. */
  let plans = Array.isArray(savedOps.commissionPlans) ? savedOps.commissionPlans : null;
  if (!plans) {
    const seeded = SEED_COMMISSION_PLANS();
    const hadCustomTiers = Array.isArray(savedOps.commission?.tiers) && savedOps.commission.tiers.length;
    plans = hadCustomTiers
      ? [
          seeded[0],
          {
            ...seeded[1],
            name: "Standard Sales (your existing tiers)",
            tiers: commission.tiers.map((t) => ({ ...blankTier(), ...t, enabled: t.enabled !== false })),
            mode: commission.mode,
            resetPeriod: commission.resetPeriod,
            clawbackRefunds: commission.clawbackRefunds,
          },
        ]
      : seeded;
  }
  plans = plans.map((pl) => ({
    ...blankCommissionPlan(), ...pl,
    tiers: (pl.tiers || []).map((t) => ({ ...blankTier(), ...t, enabled: t.enabled !== false })),
  }));

  const overrides = (Array.isArray(savedOps.overridePlans) && savedOps.overridePlans.length
    ? savedOps.overridePlans
    : SEED_OVERRIDE_PLANS()
  ).map((pl) => ({ ...blankOverridePlan(), ...pl }));

  base.ops = {
    ...defaults,
    ...savedOps,
    commission,
    commissionPlans: plans,
    overridePlans: overrides,
    bridge: { ...defaults.bridge, ...(savedOps.bridge || {}) },
    sales: (savedOps.sales || []).map((s) => ({
      ...blankSale(), ...s,
      external: { ...blankSale().external, ...(s.external || {}) },
      credits: Array.isArray(s.credits) ? s.credits : [],
      payments: Array.isArray(s.payments) ? s.payments : [],
    })),
    payouts: savedOps.payouts || [],
    bonusPools: savedOps.bonusPools || [],
    version: 3,
  };

  /* a deleted plan leaves the person on default rates rather than
     pointing at a plan that no longer exists */
  const planIds = new Set(base.ops.commissionPlans.map((pl) => pl.id));
  const overrideIds = new Set(base.ops.overridePlans.map((pl) => pl.id));
  base.people = base.people.map((p) => ({
    ...p,
    commissionPlanId: planIds.has(p.commissionPlanId) ? p.commissionPlanId : "",
    overridePlanId: overrideIds.has(p.overridePlanId) ? p.overridePlanId : "",
  }));

  return base;
}

/* ═══════════════════════════════════════════════ SMALL UI PRIMITIVES ══ */

function Dot({ sev }) { return <span className={"sev " + sev} />; }

function DeltaTag({ value }) {
  const cls = value === null ? "delta-none" : value > 0 ? "delta-up" : value < 0 ? "delta-down" : "delta-flat";
  return <span className={"delta " + cls}>{changeText(value)}</span>;
}

function YesNo({ value, onChange }) {
  return (
    <div className="yn">
      <button className={"yn-yes" + (value ? " on" : "")} onClick={() => onChange(true)}>YES</button>
      <button className={"yn-no" + (!value ? " on" : "")} onClick={() => onChange(false)}>NO</button>
    </div>
  );
}

function PeriodBar({ type, setType, offset, setOffset, today }) {
  return (
    <div className="periodbar">
      <div className="seg">
        {["week", "month", "quarter", "year"].map((t) => (
          <button key={t} className={"seg-btn" + (type === t ? " seg-on" : "")}
            onClick={() => { setType(t); setOffset(0); }}>
            {PERIOD_NOUN[t]}
          </button>
        ))}
      </div>
      <div className="navline">
        <button className="navbtn" onClick={() => setOffset(offset + 1)}>‹</button>
        <span className="navlabel">{periodLabel(type, offset, today)}</span>
        <button className="navbtn" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 1))}>›</button>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="chart-card">
      <button className="chart-head" onClick={() => setOpen(!open)}>
        <div>
          <div className="chart-title">{title}</div>
          {subtitle && <div className="chart-sub">{subtitle}</div>}
        </div>
        <span className={"chevron" + (open ? " open" : "")}>▾</span>
      </button>
      {open && <div className="chart-body">{children}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ REVENUE TAB ══ */

function ExecScorecard({ rep, type }) {
  const { cur, prev, label } = rep;
  return (
    <div className="exec">
      <div className="exec-hd">
        <span>CEO Executive Scorecard</span>
        <span className="exec-period">{label}</span>
      </div>
      <div className="exec-hero">
        <div>
          <div className="eh-val">{$$(cur.revenue)}</div>
          <div className="eh-lbl">Revenue generated</div>
        </div>
        <div className="eh-side">
          <div className="eh-row">
            <span className="eh-lbl">vs prior {PERIOD_NOUN[type].toLowerCase()}</span>
            <DeltaTag value={pctChange(cur.revenue, prev.revenue)} />
          </div>
          {cur.goal > 0 && (
            <div className="eh-row">
              <span className="eh-lbl">% of goal</span>
              <span className="eh-val" style={{ fontSize: 15 }}>{pctText(cur.pctOfGoal)}</span>
            </div>
          )}
        </div>
      </div>

      {cur.goal > 0 && (
        <div className="exec-bar">
          <div className="exec-bar-fill" style={{ width: barWidth(cur.pctOfGoal) + "%" }} />
        </div>
      )}

      <div className="exec-grid">
        <div className="eg"><div className="eg-v">{cur.deals}</div><div className="eg-l">Deals</div></div>
        <div className="eg"><div className="eg-v">{cur.units}</div><div className="eg-l">Units</div></div>
        <div className="eg"><div className="eg-v">{pctText(cur.closeRate)}</div><div className="eg-l">Close Rate</div></div>
        <div className="eg">
          <div className="eg-v">{cur.avgTransaction === null ? "—" : $$(cur.avgTransaction)}</div>
          <div className="eg-l">Avg Transaction</div>
        </div>
      </div>

      <div className="exec-foot">
        {cur.recurring > 0 && `${$$(cur.recurring)} recurring`}
        {cur.oneTime > 0 && ` · ${$$(cur.oneTime)} one-time`}
        {cur.commission > 0 && ` · ${$$(cur.commission)} commission`}
      </div>
    </div>
  );
}

function Comparison({ rep, type, offset }) {
  const { cur, prev } = rep;
  const hasPrev = prev.weeks > 0 && (prev.revenue > 0 || prev.contacted > 0 || prev.deals > 0);
  const partial = offset === 0 && type !== "week" && prev.weeks > cur.weeks && cur.weeks > 0;

  if (!hasPrev)
    return (
      <div className="panel">
        <div className="panel-hd">Performance Comparison</div>
        <p className="hint-sm">No historical comparison available yet. Close a week to start building history.</p>
      </div>
    );

  const rows: any[] = [
    ["Revenue", $$(cur.revenue), $$(prev.revenue), pctChange(cur.revenue, prev.revenue)],
    ["Deals", cur.deals, prev.deals, pctChange(cur.deals, prev.deals)],
    ["Units", cur.units, prev.units, pctChange(cur.units, prev.units)],
    ["Contacts", cur.contacted, prev.contacted, pctChange(cur.contacted, prev.contacted)],
    ["Close Rate", pctText(cur.closeRate), pctText(prev.closeRate), pctChange(cur.closeRate, prev.closeRate)],
  ];

  return (
    <div className="panel">
      <div className="panel-hd">Performance Comparison</div>
      <div className="cmp-head">
        <span className="cmp-lbl">Metric</span>
        <span className="cmp-lbl">{rep.label}</span>
        <span className="cmp-lbl">{rep.prevLabel}</span>
        <span className="cmp-lbl">Change</span>
      </div>
      {rows.map(([label, a, b, delta]) => (
        <div className="cmp-row" key={label}>
          <span className="cmp-cur">{label}</span>
          <span className="cmp-a">{a}</span>
          <span className="cmp-b">{b}</span>
          <DeltaTag value={delta} />
        </div>
      ))}
      {partial && (
        <p className="partial-note">
          This {PERIOD_NOUN[type].toLowerCase()} is still in progress — {cur.weeks} of {prev.weeks} weeks counted.
        </p>
      )}
    </div>
  );
}

function DivisionRollup({ rep }) {
  const divisions = Object.values(rep.cur.byDivision) as any[];
  if (!divisions.length) return null;
  const total = divisions.reduce((s, d) => s + d.revenue, 0);
  const sorted = divisions.sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="panel">
      <div className="panel-hd">Revenue by Division</div>
      {sorted.map((d) => (
        <div className="divrow" key={d.name}>
          <div className="divtop">
            <span className="divname">
              <span className="divdot" style={{ background: DIV_COLOR[d.name] || "#6b6257" }} />
              {d.name}
            </span>
            <span className="divrev">{$$(d.revenue)}</span>
          </div>
          <div className="divbar">
            <div className="divbar-fill"
              style={{ width: barWidth(safePct(d.revenue, total)) + "%", background: DIV_COLOR[d.name] || "#6b6257" }} />
          </div>
          <div className="divmeta">
            <span>{pctText(safePct(d.revenue, total))} of total</span>
            <span>{d.units} units</span>
            {d.goal > 0 && <span>{pctText(safePct(d.revenue, d.goal))} of goal</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function GoalAllocation({ data }) {
  const companyGoal = n(data.companyGoal);
  const allocated = data.streams.reduce((s, st) => s + n(st.companyGoal), 0);
  if (companyGoal <= 0 && allocated <= 0) return null;
  const diff = allocated - companyGoal;
  const cls = Math.abs(diff) < 1 ? "alloc-ok" : diff > 0 ? "alloc-over" : "alloc-under";

  return (
    <div className="panel alloc">
      <div className="panel-hd">Goal Allocation</div>
      <div className="alloc-row"><span>Company revenue goal</span><b>{$$(companyGoal)}</b></div>
      <div className="alloc-row"><span>Allocated across streams</span><b>{$$(allocated)}</b></div>
      <div className={"alloc-row alloc-hi " + cls}>
        <span>{Math.abs(diff) < 1 ? "Fully allocated" : diff > 0 ? "Over-allocated by" : "Unallocated"}</span>
        <b>{$$(Math.abs(diff))}</b>
      </div>
      {Math.abs(diff) >= 1 && (
        <p className="alloc-note">
          {diff > 0
            ? "Stream goals add up to more than the company goal. That is fine if it is deliberate padding."
            : "Some of the company goal is not assigned to any stream, so nobody owns it."}
        </p>
      )}
    </div>
  );
}

function RecurringPanel({ rep, type }) {
  const { cur } = rep;
  if (cur.revenue <= 0) return null;
  return (
    <div className="panel">
      <div className="panel-hd">Revenue Mix</div>
      <div className="rec-grid">
        <div className="rec"><div className="rec-v">{$$(cur.recurring)}</div><div className="rec-l">Recurring</div></div>
        <div className="rec"><div className="rec-v">{$$(cur.oneTime)}</div><div className="rec-l">One-Time</div></div>
      </div>
      <p className="hint-sm" style={{ marginTop: 8 }}>
        Recurring is {pctText(cur.recurringShare)} of {PERIOD_NOUN[type].toLowerCase()} revenue — the part that shows up again next {PERIOD_NOUN[type].toLowerCase()} without being re-sold.
      </p>
    </div>
  );
}

function AttentionPanel({ items }) {
  if (!items.length) return null;
  return (
    <div className="panel attn">
      <div className="attn-hd">Needs Attention</div>
      {items.map((it, i) => (
        <div className="attn-row" key={i}><Dot sev={it.sev} /><span>{it.text}</span></div>
      ))}
    </div>
  );
}

function CatalogModal({ existing, onSelect, onClose }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <div className="modal-title">Service Catalog</div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <input className="input modal-search" placeholder="Search the catalog…"
          value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <div className="modal-body">
          {CATALOG.map((group) => {
            const items = group.items.filter((i) => !query || i.name.toLowerCase().includes(query));
            if (!items.length) return null;
            return (
              <div key={group.division}>
                <div className="cat-div">{group.division}</div>
                {items.map((item) => {
                  const added = existing.some((s) => s.name === item.name);
                  return (
                    <button className="cat-row" key={item.name} disabled={added}
                      onClick={() => onSelect(item, group.division)}>
                      <span className="cat-name">{item.name}</span>
                      <span className="cat-px">
                        {item.prices.length ? item.prices.map((p) => "$" + p).join(" / ") : "Custom"}
                      </span>
                      {added && <span className="added-tag">added</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StreamCard({ stream: s, people, onUpdate, onRemove }) {
  const [open, setOpen] = useState(false);
  const c = calcStream(s, people);
  const set = (patch) => onUpdate({ ...s, ...patch });

  return (
    <div className="card">
      <div className="card-head" onClick={() => setOpen(!open)}>
        <div className="card-head-left">
          <div className="card-name-row">
            <span className="card-name">{s.name || "Unnamed stream"}</span>
            <span className="type-tag">{s.revenueType}</span>
          </div>
          <div className="card-meta">
            <span className="div-chip" style={{ background: (DIV_COLOR[s.division] || "#6b6257") + "1a", color: DIV_COLOR[s.division] || "#6b6257" }}>
              {s.division}
            </span>
            <span>{$$(c.price)} × {c.totalQty}</span>
          </div>
          <div className="score-line">
            <span className="sl sl-rev">Revenue <b>{$$(c.revenue)}</b></span>
            {c.goal > 0 && <span className="sl">Goal <b>{$$(c.goal)}</b></span>}
            {c.pctOfGoal !== null && (
              <span className={"sl-pct " + (c.pctOfGoal >= 100 ? "ok" : c.pctOfGoal >= 70 ? "mid" : "low")}>
                {pctText(c.pctOfGoal)}
              </span>
            )}
          </div>
          {c.goal > 0 && (
            <div className="progbar"><div className="progbar-fill" style={{ width: barWidth(c.pctOfGoal) + "%" }} /></div>
          )}
          {c.salesLeft !== null && c.salesLeft > 0 && (
            <div className="tap-hint">{c.salesLeft} more sales to hit goal</div>
          )}
        </div>
        <span className={"chevron" + (open ? " open" : "")}>▾</span>
      </div>

      {open && (
        <div className="card-body">
          <label className="field">
            <span className="field-lbl">Stream name</span>
            <input className="input" value={s.name} placeholder="Stream name"
              onChange={(e) => set({ name: e.target.value })} />
          </label>

          <div className="g2">
            <label className="field">
              <span className="field-lbl">Division</span>
              <select className="input" value={s.division} onChange={(e) => set({ division: e.target.value })}>
                {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-lbl">Revenue type</span>
              <select className="input" value={s.revenueType} onChange={(e) => set({ revenueType: e.target.value })}>
                {REVENUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>

          <div className="field">
            <span className="field-lbl">Price per unit</span>
            {s.catalogPrices?.length > 0 && (
              <div className="seg" style={{ marginBottom: 6 }}>
                {s.catalogPrices.map((p) => (
                  <button key={p}
                    className={"seg-btn" + (s.priceMode === "catalog" && String(s.selectedPrice) === String(p) ? " seg-on" : "")}
                    onClick={() => set({ priceMode: "catalog", selectedPrice: String(p) })}>${p}</button>
                ))}
                <button className={"seg-btn" + (s.priceMode === "custom" ? " seg-on" : "")}
                  onClick={() => set({ priceMode: "custom" })}>Custom…</button>
              </div>
            )}
            {(s.priceMode === "custom" || !s.catalogPrices?.length) && (
              <input className="input" type="number" inputMode="decimal" placeholder="Enter price"
                value={s.customPrice} onChange={(e) => set({ priceMode: "custom", customPrice: e.target.value })} />
            )}
          </div>

          <div className="g2">
            <label className="field">
              <span className="field-lbl">Company goal (this week)</span>
              <input className="input" type="number" inputMode="decimal" placeholder="0"
                value={s.companyGoal} onChange={(e) => set({ companyGoal: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-lbl">House units (not from a rep)</span>
              <input className="input" type="number" inputMode="numeric" placeholder="0"
                value={s.houseQty} onChange={(e) => set({ houseQty: e.target.value })} />
            </label>
          </div>

          <div className="matrix">
            <div className="mx-row mx-total">
              <span className="mx-name">Team units</span>
              <span className="mx-px">{c.teamQty}</span>
              <span className="mx-rev">{$$(c.price * c.teamQty)}</span>
            </div>
            <div className="mx-row">
              <span className="mx-name">House units</span>
              <span className="mx-px">{c.houseQty}</span>
              <span className="mx-rev">{$$(c.price * c.houseQty)}</span>
            </div>
          </div>

          <p className="hint-xs">Units sold are entered per person on the Team tab and roll up here automatically.</p>
          <button className="btn-danger" onClick={onRemove}>Remove stream</button>
        </div>
      )}
    </div>
  );
}

function StreamPerformance({ rep }) {
  const streams = (Object.values(rep.cur.byStream) as any[]).sort((a, b) => b.revenue - a.revenue);
  if (!streams.length) return null;
  const top = streams[0].revenue || 1;

  return (
    <div className="panel">
      <div className="panel-hd">Revenue by Stream</div>
      {streams.map((s) => (
        <div className="sp-row" key={s.name}>
          <div className="sp-top">
            <span className="sp-nm">{s.name}</span>
            <span className="sp-rv">{$$(s.revenue)}</span>
          </div>
          <div className="divbar">
            <div className="divbar-fill"
              style={{ width: barWidth(safePct(s.revenue, top)) + "%", background: DIV_COLOR[s.division] || "#B8860B" }} />
          </div>
          <div className="sp-meta">
            <span>{s.units} units</span>
            {s.goal > 0 && <span>{pctText(safePct(s.revenue, s.goal))} of goal</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function PersonPerformance({ rep }) {
  const people = (Object.values(rep.cur.byPerson) as any[]).sort((a, b) => b.revenue - a.revenue);
  if (!people.length) return null;

  return (
    <div className="panel">
      <div className="panel-hd">Revenue by Team Member</div>
      <div className="rep-list">
        {people.map((p) => (
          <div className="rep-row" key={p.name}>
            <span className="rep-nm">{p.name}</span>
            <span className="rep-q">{p.units}u · {p.deals}d</span>
            <span className="rep-rv">{$$(p.revenue)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueTab({ data, setData, type, offset, setType, setOffset, today, onCloseWeek }) {
  const [showCat, setShowCat] = useState(false);
  const rep = useMemo(() => periodReport(data, type, offset, today), [data, type, offset]);
  const items = useMemo(() => attentionItems(data, rep, type), [data, rep, type]);

  const addStream = (item, division) => {
    setData((d) => ({ ...d, streams: [...d.streams, blankStream(item.name, item.prices, division, item.type)] }));
    setShowCat(false);
  };

  const loadStarter = () =>
    setData((d) => ({
      ...d,
      streams: [
        ...d.streams,
        ...STARTER.filter(([nm]) => !d.streams.some((s) => s.name === nm))
          .map(([nm, div, px, ty]: any) => blankStream(nm, px, div, ty)),
      ],
    }));

  return (
    <div className="tab-body">
      <PeriodBar type={type} setType={setType} offset={offset} setOffset={setOffset} today={today} />
      <ExecScorecard rep={rep} type={type} />
      <AttentionPanel items={items} />

      <div className="company-block">
        <label className="field">
          <span className="field-lbl">Company revenue goal ($)</span>
          <input className="input" type="number" inputMode="decimal" placeholder="0"
            value={data.companyGoal} onChange={(e) => setData((d) => ({ ...d, companyGoal: e.target.value }))} />
        </label>
      </div>

      <GoalAllocation data={data} />
      <DivisionRollup rep={rep} />
      <StreamPerformance rep={rep} />
      <PersonPerformance rep={rep} />
      <RecurringPanel rep={rep} type={type} />
      <Comparison rep={rep} type={type} offset={offset} />

      <div className="row-between">
        <h2>Revenue Streams</h2>
        <button className="btn-primary" onClick={() => setShowCat(true)}>+ Add Stream</button>
      </div>
      <p className="hint-sm">Set price, division, type, and goal here. Units sold are entered per person in the Team tab and roll up automatically.</p>

      {data.streams.length === 0 ? (
        <div className="empty-state">
          <div className="e-icon">💰</div>
          <div className="e-h">No streams yet</div>
          <div className="e-sub">Load your six current streams in one tap, or pick from the full catalog.</div>
          <button className="btn-primary" onClick={loadStarter}>Load starter streams</button>
        </div>
      ) : (
        data.streams.map((s) => (
          <StreamCard key={s.id} stream={s} people={data.people}
            onUpdate={(next) => setData((d) => ({ ...d, streams: d.streams.map((x) => (x.id === s.id ? next : x)) }))}
            onRemove={() => setData((d) => ({ ...d, streams: d.streams.filter((x) => x.id !== s.id) }))} />
        ))
      )}

      <button className="btn-close-week" onClick={onCloseWeek}>Close week & save snapshot</button>
      <p className="hint-xs center">Saves this week permanently, then starts a fresh week. History is never deleted.</p>

      {showCat && (
        <CatalogModal existing={data.streams} onSelect={addStream} onClose={() => setShowCat(false)} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ TEAM TAB ══ */

function PersonCard({ person: p, data, streams, onUpdate, onRemove }) {
  const [open, setOpen] = useState(false);
  const c = calcPerson(p, streams);
  const set = (patch) => onUpdate({ ...p, ...patch });
  const setLine = (sid, qty) =>
    onUpdate({ ...p, lines: { ...(p.lines || {}), [sid]: { qty } } });

  /* What this person's units become once they cross the bridge. */
  const bridge = data.ops.bridge || defaultBridge();
  const derived = useMemo(
    () => activeWeekTeamSales(data).filter((s) => s.credits[0]?.memberId === p.id),
    [data, p.id]);
  const summary = useMemo(() => memberSummary(data, p.id), [data, p.id]);
  const derivedRevenue = derived.reduce((s, sale) => s + n(sale.saleAmount), 0);

  return (
    <div className="card">
      <div className="card-head" onClick={() => setOpen(!open)}>
        <div className="card-head-left">
          <div className="card-name-row">
            <span className="card-name">{p.name || "Unnamed"}</span>
            {p.role && <span className="role-tag">{p.role}</span>}
          </div>
          <div className="score-line">
            <span className="sl sl-rev">Revenue <b>{$$(c.revenue)}</b></span>
            <span className="sl">Units <b>{c.units}</b></span>
            <span className="sl">Deals <b>{c.deals}</b></span>
            {c.pctOfGoal !== null && (
              <span className={"sl-pct " + (c.pctOfGoal >= 100 ? "ok" : c.pctOfGoal >= 70 ? "mid" : "low")}>
                {pctText(c.pctOfGoal)}
              </span>
            )}
          </div>
          {c.goal > 0 && (
            <div className="progbar"><div className="progbar-fill" style={{ width: barWidth(c.pctOfGoal) + "%" }} /></div>
          )}
          <div className="score-line">
            <span className="sl">Commission this period <b>{$$c(summary.progress.commission)}</b></span>
            {summary.progress.current && <span className="tag-pill">{summary.progress.current.name} · {summary.progress.current.rate}%</span>}
          </div>
        </div>
        <span className={"chevron" + (open ? " open" : "")}>▾</span>
      </div>

      {open && (
        <div className="card-body">
          <div className="g2">
            <label className="field">
              <span className="field-lbl">Name</span>
              <input className="input" placeholder="Team member name" value={p.name}
                onChange={(e) => set({ name: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-lbl">Role</span>
              <input className="input" placeholder="Position" value={p.role}
                onChange={(e) => set({ role: e.target.value })} />
            </label>
          </div>

          <div className="sect-lbl">Funnel</div>
          <div className="funnel-grid">
            <label className="fn-cell">
              <span className="fn-lbl">People Contacted</span>
              <input className="input" type="number" inputMode="numeric" placeholder="0"
                value={p.contacted} onChange={(e) => set({ contacted: e.target.value })} />
            </label>
            <label className="fn-cell">
              <span className="fn-lbl">Conversations</span>
              <input className="input" type="number" inputMode="numeric" placeholder="0"
                value={p.conversations} onChange={(e) => set({ conversations: e.target.value })} />
            </label>
            <label className="fn-cell">
              <span className="fn-lbl">Offers Made</span>
              <input className="input" type="number" inputMode="numeric" placeholder="0"
                value={p.offers} onChange={(e) => set({ offers: e.target.value })} />
            </label>
            <label className="fn-cell">
              <span className="fn-lbl">Clients / Deals Closed</span>
              <input className="input" type="number" inputMode="numeric" placeholder="0"
                value={p.dealsClosed} onChange={(e) => set({ dealsClosed: e.target.value })} />
            </label>
          </div>

          <div className="rate-strip">
            <div className="rt">Contact → Convo <b>{pctText(c.contactToConvo)}</b></div>
            <div className="rt">Convo → Offer <b>{pctText(c.convoToOffer)}</b></div>
            <div className="rt">Offer → Close <b>{pctText(c.offerToClose)}</b></div>
            <div className="rt">Overall Close <b>{pctText(c.overallClose)}</b></div>
          </div>

          <div className="sect-lbl">Units Sold by Stream</div>
          <p className="hint-xs">One client buying three products = 1 deal, 3 units. Enter units below.</p>
          {streams.length === 0 ? (
            <p className="hint-sm">No streams yet — add them on the Revenue tab.</p>
          ) : (
            <div className="matrix">
              {streams.map((s) => {
                const qty = lineQty(p, s.id);
                const price = effPrice(s);
                return (
                  <div className="mx-row" key={s.id}>
                    <span className="mx-name">{s.name || "Unnamed stream"}</span>
                    <span className="mx-px">{$$(price)}</span>
                    <input className="input mx-in" type="number" inputMode="numeric" placeholder="0"
                      value={(p.lines?.[s.id]?.qty) ?? ""}
                      onChange={(e) => setLine(s.id, e.target.value)} />
                    <span className="mx-rev">{$$(price * qty)}</span>
                  </div>
                );
              })}
              <div className="mx-row mx-total">
                <span className="mx-name">Total</span>
                <span className="mx-px" />
                <span className="mx-in-static">{c.units}</span>
                <span className="mx-rev">{$$(c.revenue)}</span>
              </div>
            </div>
          )}

          {/* ── the bridge, made visible ─────────────────────────────── */}
          <div className="sect-lbl">Where these units go</div>
          {!bridge.enabled ? (
            <div className="ops-warn">
              The Team → Sales bridge is switched off, so these units are not reaching the
              Sales Ledger, commissions, or tiers. Turn it on in Settings.
            </div>
          ) : derived.length === 0 ? (
            <p className="hint-sm">Enter units above and they will appear here as sales, credited to {p.name || "this person"}.</p>
          ) : (
            <>
              <div className="mini-table">
                {derived.map((s) => (
                  <div className="sale-row" key={s.id}>
                    <div className="sale-main">
                      <div className="sale-title">{s.product}</div>
                      <div className="sale-sub">
                        {s.units} units · {divisionName(data, s.divisionId)} ·{" "}
                        {s.commissionable ? "Commission eligible" : "Not commissionable"}
                      </div>
                    </div>
                    <div className="sale-amt">{$$(s.saleAmount)}</div>
                  </div>
                ))}
              </div>
              <div className="next-callout">
                <b>How it connects:</b> {$$(derivedRevenue)} of units becomes {derived.length} sale
                {derived.length > 1 ? "s" : ""} in the Sales Ledger, credited 100% to {p.name || "this person"}
                {bridge.treatAsCollected ? " and counted as collected" : " and waiting on payment"}.
                That is what feeds commission and tier placement.
              </div>
            </>
          )}

          <label className="field">
            <span className="field-lbl">Weekly goal</span>
            <input className="input" type="number" inputMode="decimal" placeholder="0"
              value={p.weeklyGoal} onChange={(e) => set({ weeklyGoal: e.target.value })} />
          </label>

          <button className="btn-danger" onClick={onRemove}>Remove team member</button>
        </div>
      )}
    </div>
  );
}

function TeamTab({ data, setData, today }) {
  const totals = data.people.reduce(
    (acc, p) => {
      const c = calcPerson(p, data.streams);
      acc.revenue += c.revenue; acc.units += c.units; acc.deals += c.deals;
      return acc;
    },
    { revenue: 0, units: 0, deals: 0 });

  const bridge = data.ops.bridge || defaultBridge();
  const derivedCount = activeWeekTeamSales(data).length;

  return (
    <div className="tab-body">
      <div className="ops-hero">
        <div className="ops-eyebrow">Team · week of {data.activeWeekStart}</div>
        <div className="ops-hero-row">
          <div>
            <div className="ops-big">{$$(totals.revenue)}</div>
            <div className="ops-big-lbl">Team revenue this week</div>
          </div>
        </div>
        <div className="ops-kpis">
          <div className="ops-kpi"><div className="eg-v">{totals.units}</div><div className="eg-l">Units</div></div>
          <div className="ops-kpi"><div className="eg-v">{totals.deals}</div><div className="eg-l">Deals</div></div>
          <div className="ops-kpi"><div className="eg-v">{derivedCount}</div><div className="eg-l">Sales created</div></div>
        </div>
      </div>

      {!bridge.enabled && (
        <div className="ops-warn">
          Team units are not flowing into the Sales Ledger or commissions. Turn the
          Team → Sales bridge back on in Settings.
        </div>
      )}

      <div className="row-between">
        <h2>Team Members</h2>
        <button className="btn-primary"
          onClick={() => setData((d) => ({ ...d, people: [...d.people, blankPerson()] }))}>
          + Add Member
        </button>
      </div>

      {data.people.length === 0 ? (
        <div className="empty-state">
          <div className="e-icon">👥</div>
          <div className="e-h">No team members yet</div>
          <div className="e-sub">Add the people selling, then enter their units each week.</div>
        </div>
      ) : (
        data.people.map((p) => (
          <PersonCard key={p.id} person={p} data={data} streams={data.streams}
            onUpdate={(next) => setData((d) => ({ ...d, people: d.people.map((x) => (x.id === p.id ? next : x)) }))}
            onRemove={() => setData((d) => ({ ...d, people: d.people.filter((x) => x.id !== p.id) }))} />
        ))
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════ SALES TAB ══ */

function SaleForm({ sale, data, people, streams, isNew, onChange }) {
  const set = (patch) => onChange({ ...sale, ...patch, updatedAt: new Date().toISOString() });

  const setCredit = (idx, patch) =>
    set({ credits: sale.credits.map((c, i) => (i === idx ? { ...c, ...patch } : c)) });

  return (
    <div className="inline-form">
      <div className="g2">
        <label className="field">
          <span className="field-lbl">Client</span>
          <input className="input" placeholder="Client or company" value={sale.clientName}
            onChange={(e) => set({ clientName: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-lbl">Date sold</span>
          <input className="input" type="date" value={sale.dateSold}
            onChange={(e) => set({ dateSold: e.target.value })} />
        </label>
      </div>

      <div className="g2">
        <label className="field">
          <span className="field-lbl">Division</span>
          <select className="input" value={sale.divisionId} onChange={(e) => set({ divisionId: e.target.value })}>
            {divisionList(data).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-lbl">Product / service</span>
          <select className="input" value={sale.streamId}
            onChange={(e) => {
              const st = streams.find((s) => s.id === e.target.value);
              set({
                streamId: e.target.value,
                product: st ? st.name : sale.product,
                saleAmount: st && !sale.saleAmount ? String(effPrice(st)) : sale.saleAmount,
              });
            }}>
            <option value="">Choose…</option>
            {streams.map((s) => <option key={s.id} value={s.id}>{s.name || "Unnamed stream"}</option>)}
          </select>
        </label>
      </div>

      <div className="g2">
        <label className="field">
          <span className="field-lbl">Sale amount ($)</span>
          <input className="input" type="number" inputMode="decimal" placeholder="0"
            value={sale.saleAmount} onChange={(e) => set({ saleAmount: e.target.value })} />
        </label>
        <div className="field">
          <span className="field-lbl">Commissionable?</span>
          <YesNo value={sale.commissionable} onChange={(v) => set({ commissionable: v })} />
        </div>
      </div>

      <div className="sect-lbl">Sold by</div>
      {people.length === 0 ? (
        <p className="hint-sm">Add team members on the Team tab first.</p>
      ) : (
        <>
          {(sale.credits || []).map((credit, i) => (
            <div className="g2" key={i}>
              <label className="field">
                <span className="field-lbl">Member</span>
                <select className="input" value={credit.memberId}
                  onChange={(e) => setCredit(i, { memberId: e.target.value })}>
                  <option value="">Choose…</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name || "Unnamed"}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field-lbl">Split with · share %</span>
                <div className="btn-row">
                  <input className="input" type="number" inputMode="decimal" placeholder="100"
                    value={credit.share} onChange={(e) => setCredit(i, { share: e.target.value })} />
                  <button className="btn-sm" onClick={() => set({ credits: sale.credits.filter((_, x) => x !== i) })}>✕</button>
                </div>
              </label>
            </div>
          ))}
          <button className="btn-sm" onClick={() => set({ credits: [...(sale.credits || []), { memberId: "", share: 100 }] })}>
            + Credit someone
          </button>
        </>
      )}

      <label className="field">
        <span className="field-lbl">Notes</span>
        <input className="input" placeholder="Optional" value={sale.notes}
          onChange={(e) => set({ notes: e.target.value })} />
      </label>
    </div>
  );
}

function SaleRow({ sale, data, people, streams, onUpdate, onRemove, onPromote }) {
  const [open, setOpen] = useState(false);
  const collected = saleCollected(sale);
  const outstanding = saleOutstanding(sale);
  const splits = saleCommissionSplit(data, sale);
  const nameOf = (id) => people.find((p) => p.id === id)?.name || "Unnamed";
  const over = collected > n(sale.saleAmount) + 0.5;

  const addPayment = () =>
    onUpdate({ ...sale, payments: [...(sale.payments || []), blankPayment("")] });

  return (
    <div className="card">
      <div className="card-head" onClick={() => setOpen(!open)}>
        <div className="card-head-left">
          <div className="card-name-row">
            <span className="card-name">{sale.clientName || "Unnamed"}</span>
            {sale.derived && <span className="chip chip-gold">From Team tab</span>}
            {sale.commissionable
              ? <span className="chip chip-ink">Commissionable</span>
              : <span className="chip">Not commissionable</span>}
          </div>
          <div className="card-meta">
            <span className="div-chip" style={{ background: divisionColor(data, sale.divisionId) + "1a", color: divisionColor(data, sale.divisionId) }}>
              {divisionName(data, sale.divisionId)}
            </span>
            <span>{sale.product || "—"}</span>
            <span>{sale.dateSold}</span>
          </div>
          <div className="score-line">
            <span className="sl sl-rev">Sale <b>{$$(sale.saleAmount)}</b></span>
            <span className="sl">Collected <b>{$$(collected)}</b></span>
            {outstanding > 0 && <span className="sl">Still owed <b>{$$(outstanding)}</b></span>}
          </div>
          {(sale.credits || []).length > 0 && (
            <div className="card-meta">
              <span>Sold by {saleCredits(sale).map((c) => `${nameOf(c.memberId)} (${c.share}%)`).join(" · ")}</span>
            </div>
          )}
        </div>
        <span className={"chevron" + (open ? " open" : "")}>▾</span>
      </div>

      {open && (
        <div className="card-body">
          {over && <div className="ops-warn">Collected exceeds sale amount.</div>}

          {sale.derived ? (
            <>
              <div className="readonly-note">
                This sale was generated from {nameOf(sale.credits[0]?.memberId)}'s units on the Team tab
                for the week of {sale.dateSold}. Change the units there and this updates itself.
              </div>
              <button className="btn-secondary" onClick={onPromote}>
                Convert to an editable sale record
              </button>
              <p className="hint-xs">
                Converting makes a normal ledger record with real payment dates. The Team tab
                entry stops generating a duplicate.
              </p>
            </>
          ) : (
            <SaleForm sale={sale} data={data} people={people} streams={streams} isNew={false} onChange={onUpdate} />
          )}

          <div className="sect-lbl">Payments collected</div>
          {(sale.payments || []).length === 0 && <p className="hint-sm">Nothing collected yet.</p>}
          {(sale.payments || []).map((pay, i) => (
            <div className="g2" key={pay.id}>
              <label className="field">
                <span className="field-lbl">Date collected</span>
                <input className="input" type="date" value={pay.date} disabled={sale.derived}
                  onChange={(e) => onUpdate({ ...sale, payments: sale.payments.map((x, k) => k === i ? { ...x, date: e.target.value } : x) })} />
              </label>
              <label className="field">
                <span className="field-lbl">Amount</span>
                <div className="btn-row">
                  <input className="input" type="number" inputMode="decimal" placeholder="0"
                    value={pay.amount} disabled={sale.derived}
                    onChange={(e) => onUpdate({ ...sale, payments: sale.payments.map((x, k) => k === i ? { ...x, amount: e.target.value } : x) })} />
                  {!sale.derived && (
                    <button className="btn-sm" onClick={() => onUpdate({ ...sale, payments: sale.payments.filter((_, k) => k !== i) })}>✕</button>
                  )}
                </div>
              </label>
            </div>
          ))}
          {!sale.derived && (
            <div className="btn-row">
              <button className="btn-sm" onClick={addPayment}>+ Record payment</button>
              <button className="btn-sm" onClick={() => onUpdate({ ...sale, payments: [...(sale.payments || []), blankPayment("-0")] })}>
                Record refund
              </button>
            </div>
          )}

          {sale.commissionable && splits.length > 0 && (
            <>
              <div className="sect-lbl">Commission on this sale</div>
              <div className="mini-table">
                {splits.map((s) => (
                  <div className="sale-row" key={s.memberId}>
                    <div className="sale-main">
                      <div className="sale-title">{nameOf(s.memberId)}</div>
                      <div className="sale-sub">{s.share}% credit · {$$(s.credited)} credited · {pctText(s.rate)} effective</div>
                    </div>
                    <div className="sale-amt">{$$c(s.commission)}</div>
                  </div>
                ))}
              </div>
              <p className="hint-xs">Commission figures will recalc as more is collected and as the tier moves.</p>
            </>
          )}

          {!sale.derived && <button className="btn-danger" onClick={onRemove}>Delete sale</button>}
        </div>
      )}
    </div>
  );
}

function SalesTab({ data, setData, today }) {
  const [draft, setDraft] = useState(null);
  const [firstPayment, setFirstPayment] = useState("");
  const [firstPaymentDate, setFirstPaymentDate] = useState(isoD(today0()));
  const [filterDiv, setFilterDiv] = useState("");
  const [filterMember, setFilterMember] = useState("");

  const sales = useMemo(() => allSales(data), [data]);
  const window = commissionWindow(isoD(today), data.ops.commission.resetPeriod);

  const visible = sales
    .filter((s) => !filterDiv || s.divisionId === filterDiv)
    .filter((s) => !filterMember || saleCredits(s).some((c) => c.memberId === filterMember))
    .sort((a, b) => (a.dateSold < b.dateSold ? 1 : -1));

  const booked = visible.reduce((s, x) => s + n(x.saleAmount), 0);
  const collected = visible.reduce((s, x) => s + saleCollected(x), 0);
  const outstanding = visible.reduce((s, x) => s + saleOutstanding(x), 0);
  const fromTeam = visible.filter((s) => s.derived).length;

  const saveDraft = () => {
    const paid = n(firstPayment);
    const sale = {
      ...draft,
      payments: paid > 0
        ? [...(draft.payments || []), blankPayment(String(paid), firstPaymentDate || draft.dateSold)]
        : (draft.payments || []),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, ops: { ...d.ops, sales: [sale, ...d.ops.sales] } }));
    setDraft(null);
    setFirstPayment("");
    setFirstPaymentDate(isoD(today0()));
  };

  const updateSale = (sale) =>
    setData((d) => ({ ...d, ops: { ...d.ops, sales: d.ops.sales.map((x) => (x.id === sale.id ? sale : x)) } }));

  const promote = (sale) =>
    setData((d) => ({ ...d, ops: { ...d.ops, sales: [promoteTeamSale(sale), ...d.ops.sales] } }));

  return (
    <div className="tab-body">
      <div className="ops-hero">
        <div className="ops-eyebrow">Sales Ledger · {window.label}</div>
        <div className="ops-hero-row">
          <div>
            <div className="ops-big">{$$(collected)}</div>
            <div className="ops-big-lbl">Collected</div>
          </div>
        </div>
        <div className="ops-kpis">
          <div className="ops-kpi"><div className="eg-v">{$$(booked)}</div><div className="eg-l">Sold</div></div>
          <div className="ops-kpi"><div className="eg-v">{$$(outstanding)}</div><div className="eg-l">Still owed</div></div>
          <div className="ops-kpi"><div className="eg-v">{visible.length}</div><div className="eg-l">Sales</div></div>
        </div>
      </div>

      {fromTeam > 0 && (
        <div className="next-callout">
          <b>{fromTeam}</b> of these came straight from Team tab units. They carry the
          seller's credit, so they count toward commission and tiers.
        </div>
      )}

      <div className="ops-toolbar">
        <select className="input" value={filterDiv} onChange={(e) => setFilterDiv(e.target.value)}>
          <option value="">All divisions</option>
          {divisionList(data).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="input" value={filterMember} onChange={(e) => setFilterMember(e.target.value)}>
          <option value="">Everyone</option>
          {data.people.map((p) => <option key={p.id} value={p.id}>{p.name || "Unnamed"}</option>)}
        </select>
      </div>

      <div className="row-between">
        <h2>Sales</h2>
        {!draft && (
          <button className="btn-primary" onClick={() => {
            setDraft(blankSale({ divisionId: divisionList(data)[0]?.id || "" }));
            setFirstPayment("");
            setFirstPaymentDate(isoD(today0()));
          }}>+ New Sale</button>
        )}
      </div>

      {draft && (
        <div className="panel">
          <div className="panel-hd">New Sale</div>
          <SaleForm sale={draft} data={data} people={data.people} streams={data.streams} isNew onChange={setDraft} />

          <div className="sect-lbl">Collected now</div>
          <div className="g2">
            <label className="field">
              <span className="field-lbl">Amount collected today ($)</span>
              <input className="input" type="number" inputMode="decimal" placeholder="0"
                value={firstPayment} onChange={(e) => setFirstPayment(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-lbl">Date collected</span>
              <input className="input" type="date" value={firstPaymentDate}
                onChange={(e) => setFirstPaymentDate(e.target.value)} />
            </label>
          </div>
          <div className="btn-row">
            <button className="btn-sm" onClick={() => setFirstPayment(draft.saleAmount)}>
              Paid in full ({$$(draft.saleAmount)})
            </button>
            <button className="btn-sm" onClick={() => setFirstPayment("")}>Nothing yet</button>
          </div>
          {n(firstPayment) > n(draft.saleAmount) && n(draft.saleAmount) > 0 && (
            <div className="ops-warn">That is more than the sale amount.</div>
          )}
          <p className="hint-xs">
            Leave this empty for an enrollment on a payment plan that has not paid yet — you can
            record each installment on the sale as it clears. Commission counts collected cash only.
          </p>

          <div className="btn-row">
            <button className="btn-primary" onClick={saveDraft}>Save sale</button>
            <button className="btn-secondary" onClick={() => { setDraft(null); setFirstPayment(""); }}>Cancel</button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="empty-state">
          <div className="e-icon">🧾</div>
          <div className="e-h">No sales yet</div>
          <div className="e-sub">Enter units on the Team tab or add a sale directly.</div>
        </div>
      ) : (
        visible.map((sale) => (
          <SaleRow key={sale.id} sale={sale} data={data} people={data.people} streams={data.streams}
            onUpdate={updateSale}
            onPromote={() => promote(sale)}
            onRemove={() => setData((d) => ({ ...d, ops: { ...d.ops, sales: d.ops.sales.filter((x) => x.id !== sale.id) } }))} />
        ))
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ COMMISSIONS TAB ══ */

function TierTrack({ progress, commission }) {
  const tiers = usableTiers(commission);
  if (!tiers.length) return null;
  const { current, next, pctToNext } = progress;

  return (
    <div className="tier-card">
      <div className="tier-track">
        <div className="tier-fill" style={{ width: barWidth(pctToNext) + "%" }} />
        {current && <span className="tier-now">{current.name} · {current.rate}%</span>}
      </div>
      <div className="tier-legend">
        {tiers.map((t) => (
          <span key={t.id} className={current && t.id === current.id ? "chip chip-gold" : "chip"}>
            {t.name} · {t.rate}% at {$$(t.min)}
          </span>
        ))}
      </div>
      {next && (
        <div className="next-callout">
          {$$(progress.needed)} more collected reaches <b>{next.name}</b> ({next.rate}%)
          {progress.commissionAtNext !== null && <> — worth {$$c(progress.commissionAtNext)} at that point.</>}
        </div>
      )}
    </div>
  );
}

function MemberCommissionCard({ person, data, setData }) {
  const [open, setOpen] = useState(false);
  const summary = useMemo(() => memberSummary(data, person.id), [data, person.id]);
  const bonus = useMemo(() => memberBonus(data, person.id), [data, person.id]);
  const commission = summary.plan;
  const override = summary.override;

  const recordPayout = () =>
    setData((d) => ({
      ...d,
      ops: { ...d.ops, payouts: [...(d.ops.payouts || []), blankPayout(person.id)] },
    }));

  const myPayouts = (data.ops.payouts || []).filter((p) => p.memberId === person.id);

  return (
    <div className="card">
      <div className="card-head" onClick={() => setOpen(!open)}>
        <div className="card-head-left">
          <div className="card-name-row">
            <span className="card-name">{person.name || "Unnamed"}</span>
            {summary.progress.current && (
              <span className="chip chip-gold">{summary.progress.current.name} · {summary.progress.current.rate}%</span>
            )}
          </div>
          <div className="score-line">
            <span className="sl sl-rev">Commission so far <b>{$$c(summary.progress.commission)}</b></span>
            <span className="sl">Base <b>{$$(summary.currentBase)}</b></span>
          </div>
          <div className="score-line">
            <span className="sl">Earned (all time) <b>{$$c(summary.earnedAllTime)}</b></span>
            <span className={"sl" + (summary.owed < 0 ? " neg" : "")}>Owed <b>{$$c(summary.owed)}</b></span>
          </div>
          <div className="card-meta">
            <span className="chip">{commission.name || "Default rates"}</span>
            {override && <span className="chip chip-gold">Override {override.rate}%</span>}
            {!summary.eligible && <span className="chip">Commission off</span>}
          </div>
        </div>
        <span className={"chevron" + (open ? " open" : "")}>▾</span>
      </div>

      {open && (
        <div className="card-body">
          {!summary.eligible && (
            <div className="ops-warn">
              Personal commission is switched off for {person.name || "this person"} in
              Settings → Compensation, so nothing is being earned on their own sales.
            </div>
          )}

          <TierTrack progress={summary.progress} commission={commission} />

          <div className="cg">
            <div className="ci ci-hero">
              <div className="ci-lbl">Commissionable collected</div>
              <div className="ci-val">{$$(summary.currentBase)}</div>
            </div>
            <div className="ci">
              <div className="ci-lbl">Commission this period</div>
              <div className="ci-val">{$$c(summary.progress.commission)}</div>
            </div>
            <div className="ci">
              <div className="ci-lbl">Commission earned (all time)</div>
              <div className="ci-val">{$$c(summary.earnedAllTime)}</div>
            </div>
            <div className="ci">
              <div className="ci-lbl">Commission paid</div>
              <div className="ci-val">{$$c(summary.paid)}</div>
            </div>
          </div>

          {summary.owed < -0.01 && (
            <div className="ops-warn">
              Negative balance: a refund reduced commission after it was already paid.
            </div>
          )}

          {override && (
            <>
              <div className="sect-lbl">Leadership Override · {override.plan.name}</div>
              <div className="cg">
                <div className="ci">
                  <div className="ci-lbl">Eligible team revenue</div>
                  <div className="ci-val">{$$(override.eligible)}</div>
                </div>
                <div className="ci ci-hero">
                  <div className="ci-lbl">Override earned</div>
                  <div className="ci-val">{$$c(override.earned)}</div>
                </div>
              </div>
              {override.memberCount === 0 ? (
                <p className="hint-sm">
                  Nobody reports to {person.name || "this person"} yet, so there is no team
                  production for the override to sit on. Assign a team leader in Settings → Teams.
                </p>
              ) : (
                <p className="hint-xs">
                  {override.rate}% of commissionable collected revenue from {override.memberCount}{" "}
                  {override.memberCount === 1 ? "person" : "people"} under them
                  {override.excludedOwn ? ", excluding their own sales" : ", including their own sales"}.
                </p>
              )}
              {!override.meetsRevenue && (
                <div className="ops-warn">
                  Team revenue of {$$(override.eligible)} is below the {$$(override.minRevenue)} minimum,
                  so no override is earned this period.
                </div>
              )}
              <div className="next-callout">
                Total incentive compensation this period: <b>{$$c(summary.totalIncentive)}</b>{" "}
                ({$$c(summary.progress.commission)} personal + {$$c(override.earned)} override)
              </div>
            </>
          )}

          {bonus.total > 0 && (
            <div className="next-callout">
              Team bonus: {$$c(bonus.approved)} approved, {$$c(bonus.paid)} paid.
              Total additional compensation {$$c(summary.earnedAllTime + bonus.total)}.
            </div>
          )}

          <div className="sect-lbl">By period</div>
          {summary.windows.length === 0 ? (
            <p className="hint-sm">Nothing collected yet.</p>
          ) : (
            <div className="mini-table">
              {summary.windows.map((w: any) => (
                <div className="sale-row" key={w.key}>
                  <div className="sale-main">
                    <div className="sale-title">{w.label}</div>
                    <div className="sale-sub">
                      {$$(w.base)} collected · {w.tier ? `${w.tier.name} · ${w.tier.rate}%` : "below tier 1"} ·{" "}
                      {pctText(w.effectiveRate)} effective
                    </div>
                  </div>
                  <div className="sale-amt">{$$c(w.commission)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="sect-lbl">Record a commission payout</div>
          <p className="hint-xs">This only records a payment you already made. The dashboard never pays anyone.</p>
          {myPayouts.map((payout, i) => (
            <div className="g2" key={payout.id}>
              <label className="field">
                <span className="field-lbl">Date paid</span>
                <input className="input" type="date" value={payout.date}
                  onChange={(e) => setData((d) => ({
                    ...d, ops: { ...d.ops, payouts: d.ops.payouts.map((x) => x.id === payout.id ? { ...x, date: e.target.value } : x) },
                  }))} />
              </label>
              <label className="field">
                <span className="field-lbl">Amount</span>
                <div className="btn-row">
                  <input className="input" type="number" inputMode="decimal" placeholder="0" value={payout.amount}
                    onChange={(e) => setData((d) => ({
                      ...d, ops: { ...d.ops, payouts: d.ops.payouts.map((x) => x.id === payout.id ? { ...x, amount: e.target.value } : x) },
                    }))} />
                  <button className="btn-sm" onClick={() => setData((d) => ({
                    ...d, ops: { ...d.ops, payouts: d.ops.payouts.filter((x) => x.id !== payout.id) },
                  }))}>✕</button>
                </div>
              </label>
            </div>
          ))}
          <button className="btn-sm" onClick={recordPayout}>+ Mark as paid</button>
        </div>
      )}
    </div>
  );
}

function BonusPoolCard({ pool, data, setData }) {
  const s = bonusStatus(data, pool);
  const set = (patch) =>
    setData((d) => ({
      ...d,
      ops: { ...d.ops, bonusPools: d.ops.bonusPools.map((x) => (x.id === pool.id ? { ...x, ...patch } : x)) },
    }));

  const toggle = (id) => {
    const list = pool.eligibleMemberIds || [];
    set({ eligibleMemberIds: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
  };

  return (
    <div className="panel">
      <div className="row-between">
        <div className="panel-hd">{monthKeyWindow(pool.monthKey).label}</div>
        <span className={"chip " + (s.status === "Paid" ? "chip-ink" : s.status === "Approved" ? "chip-gold" : s.targetHit ? "chip-yes" : "")}>
          {s.status}
        </span>
      </div>

      <div className="g2">
        <label className="field">
          <span className="field-lbl">Company revenue goal ($)</span>
          <input className="input" type="number" inputMode="decimal" placeholder="0"
            value={pool.revenueGoal} onChange={(e) => set({ revenueGoal: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-lbl">Bonus pool ($)</span>
          <input className="input" type="number" inputMode="decimal" placeholder="1000"
            value={pool.poolAmount} onChange={(e) => set({ poolAmount: e.target.value })} />
        </label>
      </div>

      <label className="field">
        <span className="field-lbl">Earned at % of goal</span>
        <input className="input" type="number" inputMode="decimal" placeholder="100"
          value={pool.triggerPct} onChange={(e) => set({ triggerPct: e.target.value })} />
      </label>

      <div className="cg">
        <div className="ci"><div className="ci-lbl">Actual collected</div><div className="ci-val">{$$(s.actual)}</div></div>
        <div className="ci"><div className="ci-lbl">% achieved</div><div className="ci-val">{pctText(s.pctAchieved)}</div></div>
        <div className="ci"><div className="ci-lbl">Eligible members</div><div className="ci-val">{s.eligible}</div></div>
        <div className="ci"><div className="ci-lbl">Bonus per person</div><div className="ci-val">{$$c(s.perPerson)}</div></div>
      </div>

      <div className="sect-lbl">Eligible team members</div>
      {data.people.length === 0 ? (
        <p className="hint-sm">Add team members on the Team tab.</p>
      ) : (
        <div className="checks">
          {data.people.map((p) => {
            const on = (pool.eligibleMemberIds || []).includes(p.id);
            return (
              <span key={p.id} className={"chip chip-btn" + (on ? " chip-gold" : "")} onClick={() => toggle(p.id)}>
                {p.name || "Unnamed"}
              </span>
            );
          })}
        </div>
      )}

      <div className="btn-row">
        {s.status === "Pending Approval" && (
          <button className="btn-primary" onClick={() => set({ decision: "Approved" })}>Approve bonus</button>
        )}
        {s.status === "Approved" && (
          <button className="btn-primary" onClick={() => set({ decision: "Paid" })}>Mark as paid</button>
        )}
        {pool.decision && (
          <button className="btn-secondary" onClick={() => set({ decision: "" })}>Undo decision</button>
        )}
        <button className="btn-danger" onClick={() => setData((d) => ({
          ...d, ops: { ...d.ops, bonusPools: d.ops.bonusPools.filter((x) => x.id !== pool.id) },
        }))}>Remove</button>
      </div>
    </div>
  );
}

function CommissionsTab({ data, setData, today, goToSettings }) {
  const commission = data.ops.commission;
  const window = commissionWindow(isoD(today), commission.resetPeriod);
  const sales = useMemo(() => allSales(data), [data]);

  const eligible = data.people;
  const totals = eligible.reduce(
    (acc, p) => {
      const s = memberSummary(data, p.id, today);
      acc.base += s.currentBase;
      acc.commission += s.progress.commission;
      acc.override += s.override?.earned || 0;
      acc.owed += s.owed;
      return acc;
    },
    { base: 0, commission: 0, override: 0, owed: 0 });

  const unsetTiers = (data.ops.commissionPlans || []).flatMap((pl) =>
    (pl.tiers || []).filter((t, i) => i > 0 && t.enabled !== false && String(t.minCollected).trim() === "")
      .map((t) => ({ ...t, name: `${pl.name} · ${t.name}` })));
  const thisMonthKey = isoD(today).slice(0, 7);
  const hasPool = (data.ops.bonusPools || []).some((p) => p.monthKey === thisMonthKey);

  return (
    <div className="tab-body">
      <div className="ops-hero">
        <div className="ops-eyebrow">CEO Sales Pulse · {window.label}</div>
        <div className="ops-hero-row">
          <div>
            <div className="ops-big">{$$c(totals.commission)}</div>
            <div className="ops-big-lbl">Commission this period</div>
          </div>
        </div>
        <div className="ops-kpis">
          <div className="ops-kpi"><div className="eg-v">{$$(totals.base)}</div><div className="eg-l">Commissionable collected</div></div>
          <div className="ops-kpi"><div className="eg-v">{$$c(totals.override)}</div><div className="eg-l">Leadership overrides</div></div>
          <div className="ops-kpi"><div className="eg-v">{$$c(totals.commission + totals.override)}</div><div className="eg-l">Total incentive expense</div></div>
          <div className="ops-kpi"><div className="eg-v">{eligible.length}</div><div className="eg-l">Commission eligible</div></div>
        </div>
      </div>

      {unsetTiers.length > 0 && (
        <div className="ops-warn">
          Tier thresholds not finished. {unsetTiers.map((t) => t.name).join(" and ")} cannot be
          reached until a threshold is set.{" "}
          <button className="btn-sm-dark" onClick={goToSettings}>Open Settings</button>
        </div>
      )}

      <div className="row-between"><h2>Individual Commissions</h2></div>
      {eligible.length === 0 ? (
        <div className="empty-state">
          <div className="e-icon">🏆</div>
          <div className="e-h">No one is commission-eligible yet</div>
          <div className="e-sub">Add team members on the Team tab.</div>
        </div>
      ) : (
        eligible.map((p) => <MemberCommissionCard key={p.id} person={p} data={data} setData={setData} />)
      )}

      <div className="row-between">
        <h2>Team Bonus</h2>
        {!hasPool && (
          <button className="btn-primary" onClick={() => setData((d) => ({
            ...d, ops: { ...d.ops, bonusPools: [...(d.ops.bonusPools || []), blankBonusPool(thisMonthKey)] },
          }))}>+ Add pool</button>
        )}
      </div>
      <p className="hint-sm">A separate pool split among eligible members, released only on your approval.</p>
      {(data.ops.bonusPools || []).length === 0 ? (
        <p className="hint-sm">No bonus pool set for this month yet.</p>
      ) : (
        (data.ops.bonusPools || [])
          .sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1))
          .map((pool) => <BonusPoolCard key={pool.id} pool={pool} data={data} setData={setData} />)
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ ORG TAB ══
   Division → Team → Member, every number read from the same sale records.
   ══════════════════════════════════════════════════════════════════ */

function GoalRow({ label, goal, actual }) {
  const pct = safePct(actual, goal);
  return (
    <>
      <div className="score-line">
        <span className="sl sl-rev">Actual <b>{$$(actual)}</b></span>
        {goal > 0 && <span className="sl">Goal <b>{$$(goal)}</b></span>}
        {pct !== null && (
          <span className={"sl-pct " + (pct >= 100 ? "ok" : pct >= 70 ? "mid" : "low")}>{pctText(pct)}</span>
        )}
      </div>
      {goal > 0 && (
        <div className="progbar"><div className="progbar-fill" style={{ width: barWidth(pct) + "%" }} /></div>
      )}
    </>
  );
}

function AllocationLine({ goal, allocated }) {
  if (goal <= 0 && allocated <= 0) return null;
  const left = goal - allocated;
  const cls = Math.abs(left) < 1 ? "alloc-ok" : left < 0 ? "alloc-over" : "alloc-under";
  return (
    <div className={"alloc-row " + cls}>
      <span>{Math.abs(left) < 1 ? "Fully allocated" : left < 0 ? "Over-allocated by" : "Unallocated"}</span>
      <b>{$$(Math.abs(left))}</b>
    </div>
  );
}

function MemberLine({ person, bucket, goal, data }) {
  const pct = safePct(bucket?.booked || 0, goal);
  return (
    <div className="rep-row">
      <span className="rep-nm">
        {person.name || "Unnamed"}
        {!person.active && <span className="chip"> Inactive</span>}
      </span>
      <span className="rep-q">{Math.round(bucket?.sales || 0)} sales{goal > 0 ? ` · ${pctText(pct)}` : ""}</span>
      <span className="rep-rv">{$$(bucket?.booked || 0)}</span>
    </div>
  );
}

function TeamScorecard({ team, data, roll, alloc, setData }) {
  const [open, setOpen] = useState(false);
  const bucket = roll.byTeam[team.id] || { booked: 0, collected: 0, outstanding: 0, sales: 0, recurring: 0, oneTime: 0 };
  const leader = data.people.find((p) => p.id === team.leaderId);
  const members = membersInTeam(data, team.id);
  const node = alloc?.teams?.find((t) => t.team.id === team.id);
  const goal = node?.goal || 0;

  const setMemberGoal = (memberId, value) =>
    setData((d) => {
      const period = { ...blankGoalPeriod(), ...((d.org.goals || {})[alloc.monthKey] || {}) };
      return {
        ...d,
        org: {
          ...d.org,
          goals: {
            ...(d.org.goals || {}),
            [alloc.monthKey]: { ...period, members: { ...period.members, [memberId]: value } },
          },
        },
      };
    });

  return (
    <div className="card">
      <div className="card-head" onClick={() => setOpen(!open)}>
        <div className="card-head-left">
          <div className="card-name-row">
            <span className="card-name">{team.name || "Unnamed team"}</span>
            {team.archived && <span className="chip">Archived</span>}
          </div>
          <div className="card-meta">
            <span>{leader ? `Led by ${leader.name || "Unnamed"}` : "No team leader"}</span>
            <span>{members.length} member{members.length === 1 ? "" : "s"}</span>
          </div>
          <GoalRow label={team.name} goal={goal} actual={bucket.booked} />
        </div>
        <span className={"chevron" + (open ? " open" : "")}>▾</span>
      </div>

      {open && (
        <div className="card-body">
          <div className="cg">
            <div className="ci ci-hero"><div className="ci-lbl">Collected</div><div className="ci-val">{$$(bucket.collected)}</div></div>
            <div className="ci"><div className="ci-lbl">Still owed</div><div className="ci-val">{$$(bucket.outstanding)}</div></div>
            <div className="ci"><div className="ci-lbl">Sales</div><div className="ci-val">{Math.round(bucket.sales)}</div></div>
            <div className="ci"><div className="ci-lbl">Recurring</div><div className="ci-val">{$$(bucket.recurring)}</div></div>
          </div>

          <div className="sect-lbl">Members · goal allocation</div>
          {members.length === 0 ? (
            <p className="hint-sm">No one on this team yet. Assign people in Settings → Team Members.</p>
          ) : (
            <>
              {members.map((m) => {
                const mNode = node?.members?.find((x) => x.member.id === m.id);
                return (
                  <div className="setrow" key={m.id}>
                    <div className="setname">{m.name || "Unnamed"}</div>
                    <div className="setgrid">
                      <label className="field">
                        <span className="field-lbl">Monthly goal ($)</span>
                        <input className="input" type="number" inputMode="decimal" placeholder="0"
                          value={(alloc.rawMembers?.[m.id]) ?? ""}
                          onChange={(e) => setMemberGoal(m.id, e.target.value)} />
                      </label>
                      <div className="field">
                        <span className="field-lbl">Produced</span>
                        <div className="calc-disp">{$$(roll.byPerson[m.id]?.booked || 0)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <AllocationLine goal={goal} allocated={node?.allocated || 0} />
              <div className="rep-list">
                {members.map((m) => (
                  <MemberLine key={m.id} person={m} data={data}
                    bucket={roll.byPerson[m.id]}
                    goal={node?.members?.find((x) => x.member.id === m.id)?.goal || 0} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DivisionScorecard({ division, data, roll, alloc, setData }) {
  const [open, setOpen] = useState(false);
  const bucket = roll.byDivision[division.id] || { booked: 0, collected: 0, outstanding: 0, sales: 0, recurring: 0, oneTime: 0 };
  const leader = data.people.find((p) => p.id === division.leaderId);
  const teams = teamsInDivision(data, division.id);
  const node = alloc.divisions.find((d) => d.division.id === division.id);
  const goal = node?.goal || 0;
  const people = membersInDivision(data, division.id);

  const setTeamGoal = (teamId, value) =>
    setData((d) => {
      const period = { ...blankGoalPeriod(), ...((d.org.goals || {})[alloc.monthKey] || {}) };
      return {
        ...d,
        org: {
          ...d.org,
          goals: {
            ...(d.org.goals || {}),
            [alloc.monthKey]: { ...period, teams: { ...period.teams, [teamId]: value } },
          },
        },
      };
    });

  return (
    <div className="card">
      <div className="card-head" onClick={() => setOpen(!open)}>
        <div className="card-head-left">
          <div className="card-name-row">
            <span className="card-name">{division.name || "Unnamed division"}</span>
            {division.archived && <span className="chip">Archived</span>}
          </div>
          <div className="card-meta">
            <span className="div-chip" style={{ background: (division.color || "#6b6257") + "1a", color: division.color || "#6b6257" }}>
              {teams.length} team{teams.length === 1 ? "" : "s"}
            </span>
            <span>{leader ? `Led by ${leader.name || "Unnamed"}` : "No division leader"}</span>
            <span>{people.length} people</span>
          </div>
          <GoalRow label={division.name} goal={goal} actual={bucket.booked} />
        </div>
        <span className={"chevron" + (open ? " open" : "")}>▾</span>
      </div>

      {open && (
        <div className="card-body">
          <div className="cg">
            <div className="ci ci-hero"><div className="ci-lbl">Collected</div><div className="ci-val">{$$(bucket.collected)}</div></div>
            <div className="ci"><div className="ci-lbl">Still owed</div><div className="ci-val">{$$(bucket.outstanding)}</div></div>
            <div className="ci"><div className="ci-lbl">Sales</div><div className="ci-val">{Math.round(bucket.sales)}</div></div>
            <div className="ci"><div className="ci-lbl">Remaining to goal</div><div className="ci-val">{$$(Math.max(0, goal - bucket.booked))}</div></div>
          </div>

          <div className="sect-lbl">Teams · goal allocation</div>
          {teams.length === 0 ? (
            <p className="hint-sm">No teams in this division yet. Add one in Settings → Teams.</p>
          ) : (
            <>
              {teams.map((t) => (
                <div className="setrow" key={t.id}>
                  <div className="setname">{t.name || "Unnamed team"}</div>
                  <div className="setgrid">
                    <label className="field">
                      <span className="field-lbl">Monthly goal ($)</span>
                      <input className="input" type="number" inputMode="decimal" placeholder="0"
                        value={(alloc.rawTeams?.[t.id]) ?? ""}
                        onChange={(e) => setTeamGoal(t.id, e.target.value)} />
                    </label>
                    <div className="field">
                      <span className="field-lbl">Produced</span>
                      <div className="calc-disp">{$$(roll.byTeam[t.id]?.booked || 0)}</div>
                    </div>
                  </div>
                </div>
              ))}
              <AllocationLine goal={goal} allocated={node?.allocated || 0} />
              {teams.map((t) => (
                <TeamScorecard key={t.id} team={t} data={data} roll={roll} alloc={node} setData={setData} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function OrgTab({ data, setData, today }) {
  const [monthOffset, setMonthOffset] = useState(0);

  const month = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    return monthKeyWindow(isoD(d).slice(0, 7));
  }, [today, monthOffset]);

  const roll = useMemo(() => rollup(data, month), [data, month]);
  const alloc = useMemo(() => {
    const a: any = allocation(data, month.key);
    const period = goalPeriod(data, month.key);
    a.rawCompany = period.company;
    a.rawDivisions = period.divisions;
    a.rawTeams = period.teams;
    a.rawMembers = period.members;
    a.divisions = a.divisions.map((d) => ({ ...d, rawTeams: period.teams, rawMembers: period.members, monthKey: month.key }));
    return a;
  }, [data, month]);

  const setPeriod = (patch) =>
    setData((d) => {
      const period = { ...blankGoalPeriod(), ...((d.org.goals || {})[month.key] || {}) };
      return {
        ...d,
        org: { ...d.org, goals: { ...(d.org.goals || {}), [month.key]: { ...period, ...patch } } },
      };
    });

  const divisions = divisionList(data);
  const unassigned = data.people.filter((p) => !p.teamId);

  return (
    <div className="tab-body">
      <div className="ops-hero">
        <div className="ops-eyebrow">Company Rollup · {month.label}</div>
        <div className="ops-hero-row">
          <div>
            <div className="ops-big">{$$(roll.company.booked)}</div>
            <div className="ops-big-lbl">
              Total company revenue{alloc.companyGoal > 0 && ` · ${pctText(safePct(roll.company.booked, alloc.companyGoal))} of goal`}
            </div>
          </div>
        </div>
        <div className="ops-kpis">
          <div className="ops-kpi"><div className="eg-v">{$$(roll.company.collected)}</div><div className="eg-l">Collected</div></div>
          <div className="ops-kpi"><div className="eg-v">{$$(Math.max(0, alloc.companyGoal - roll.company.booked))}</div><div className="eg-l">Remaining</div></div>
          <div className="ops-kpi"><div className="eg-v">{Math.round(roll.company.sales)}</div><div className="eg-l">Sales</div></div>
          <div className="ops-kpi"><div className="eg-v">{$$(roll.company.recurring)}</div><div className="eg-l">Recurring</div></div>
        </div>
      </div>

      <div className="ops-monthnav">
        <button className="navbtn" onClick={() => setMonthOffset(monthOffset + 1)}>‹</button>
        <span className="navlabel">{month.label}</span>
        <button className="navbtn" disabled={monthOffset === 0} onClick={() => setMonthOffset(Math.max(0, monthOffset - 1))}>›</button>
      </div>

      <div className="panel">
        <div className="panel-hd">Company Goal · {month.label}</div>
        <label className="field">
          <span className="field-lbl">Monthly revenue goal ($)</span>
          <input className="input" type="number" inputMode="decimal" placeholder="0"
            value={alloc.rawCompany ?? ""} onChange={(e) => setPeriod({ company: e.target.value })} />
        </label>
        <div className="alloc-row"><span>Allocated to divisions</span><b>{$$(alloc.allocated)}</b></div>
        <AllocationLine goal={alloc.companyGoal} allocated={alloc.allocated} />
        <p className="hint-xs">
          This is the monthly planning layer. Weekly goals on the Revenue tab are separate and unchanged.
        </p>
      </div>

      <div className="panel">
        <div className="panel-hd">Division Goals</div>
        {divisions.length === 0 ? (
          <p className="hint-sm">No divisions yet. Add one in Settings → Divisions.</p>
        ) : (
          <>
            {divisions.map((d) => (
              <div className="setrow" key={d.id}>
                <div className="setname">
                  <span className="divdot" style={{ background: d.color || "#6b6257" }} /> {d.name}
                </div>
                <div className="setgrid">
                  <label className="field">
                    <span className="field-lbl">Monthly goal ($)</span>
                    <input className="input" type="number" inputMode="decimal" placeholder="0"
                      value={alloc.rawDivisions?.[d.id] ?? ""}
                      onChange={(e) => setPeriod({ divisions: { ...alloc.rawDivisions, [d.id]: e.target.value } })} />
                  </label>
                  <div className="field">
                    <span className="field-lbl">Produced</span>
                    <div className="calc-disp">{$$(roll.byDivision[d.id]?.booked || 0)}</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="row-between"><h2>Divisions</h2></div>
      {divisions.map((d) => (
        <DivisionScorecard key={d.id} division={d} data={data} roll={roll}
          alloc={{ ...alloc, divisions: alloc.divisions }} setData={setData} />
      ))}

      {unassigned.length > 0 && (
        <div className="panel">
          <div className="panel-hd">Not on a team yet</div>
          <p className="hint-sm">
            Their sales still count toward the company and the division that sold the product,
            but they will not appear in any team total until they are assigned.
          </p>
          <div className="rep-list">
            {unassigned.map((p) => (
              <div className="rep-row" key={p.id}>
                <span className="rep-nm">{p.name || "Unnamed"}</span>
                <span className="rep-q">{p.department}</span>
                <span className="rep-rv">{$$(roll.byPerson[p.id]?.booked || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════ CHARTS TAB ══ */

function BarList({ rows, colorFor }) {
  if (!rows.length) return <p className="hint-sm">Nothing to chart yet.</p>;
  const top = Math.max(...rows.map((r) => r.value)) || 1;
  return (
    <>
      {rows.map((r) => (
        <div className="sp-row" key={r.name}>
          <div className="sp-top">
            <span className="sp-nm">{r.name}</span>
            <span className="sp-rv">{r.display}</span>
          </div>
          <div className="divbar">
            <div className="divbar-fill"
              style={{ width: barWidth(safePct(r.value, top)) + "%", background: colorFor ? colorFor(r) : "#B8860B" }} />
          </div>
          {r.meta && <div className="sp-meta"><span>{r.meta}</span></div>}
        </div>
      ))}
    </>
  );
}

function TrendChart({ records }) {
  const weeks = records.slice(-12);
  if (weeks.length < 2) return <p className="hint-sm">Not enough history yet. Close a week to start the trend line.</p>;

  const values = weeks.map((w) => (w.streams || []).reduce((s, st) => s + n(st.revenue), 0));
  const max = Math.max(...values, 1);
  const W = 320, H = 110, pad = 6;
  const step = weeks.length > 1 ? (W - pad * 2) / (weeks.length - 1) : 0;
  const pts = values.map((v, i) => [pad + i * step, H - pad - (v / max) * (H - pad * 2)]);
  const path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 120 }} role="img" aria-label="Weekly revenue trend">
        <path d={`${path} L${pts[pts.length - 1][0]},${H - pad} L${pts[0][0]},${H - pad} Z`} fill="#B8860B22" />
        <path d={path} fill="none" stroke="#B8860B" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill="#B8860B" />)}
      </svg>
      <div className="sp-meta">
        <span>{weeks[0].weekStart} → {weeks[weeks.length - 1].weekStart}</span>
        <span>Peak {$$(max)}</span>
      </div>
    </>
  );
}

function ChartsTab({ data, type, offset, setType, setOffset, today }) {
  const rep = useMemo(() => periodReport(data, type, offset, today), [data, type, offset]);
  const records = useMemo(() => allWeekRecords(data), [data]);
  const sales = useMemo(() => allSales(data), [data]);
  const window = commissionWindow(isoD(today), data.ops.commission.resetPeriod);

  const divisionRows = (Object.values(rep.cur.byDivision) as any[])
    .sort((a, b) => b.revenue - a.revenue)
    .map((d) => ({ name: d.name, value: d.revenue, display: $$(d.revenue), meta: `${d.units} units`, division: d.name }));

  const streamRows = (Object.values(rep.cur.byStream) as any[])
    .sort((a, b) => b.revenue - a.revenue)
    .map((s) => ({ name: s.name, value: s.revenue, display: $$(s.revenue), meta: `${s.units} units`, division: s.division }));

  const personRows = (Object.values(rep.cur.byPerson) as any[])
    .sort((a, b) => b.revenue - a.revenue)
    .map((p) => ({ name: p.name, value: p.revenue, display: $$(p.revenue), meta: `${p.units} units · ${p.deals} deals` }));

  const unitRows = (Object.values(rep.cur.byStream) as any[])
    .sort((a, b) => b.units - a.units)
    .map((s) => ({ name: s.name, value: s.units, display: String(s.units), division: s.division }));

  const commissionRows = data.people
    .map((p) => {
      const s = memberSummary(data, p.id, today);
      return { name: p.name || "Unnamed", value: s.progress.commission, display: $$c(s.progress.commission), meta: `${$$(s.currentBase)} collected` };
    })
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="tab-body">
      <PeriodBar type={type} setType={setType} offset={offset} setOffset={setOffset} today={today} />

      <ChartCard title="Weekly Revenue Trend" subtitle="Last 12 weeks, including the open week" defaultOpen>
        <TrendChart records={records} />
      </ChartCard>

      <ChartCard title="Revenue by Division" subtitle={rep.label} defaultOpen>
        <BarList rows={divisionRows} colorFor={(r) => DIV_COLOR[r.division] || "#B8860B"} />
      </ChartCard>

      <ChartCard title="Revenue by Stream" subtitle={rep.label}>
        <BarList rows={streamRows} colorFor={(r) => DIV_COLOR[r.division] || "#B8860B"} />
      </ChartCard>

      <ChartCard title="Revenue by Team Member" subtitle={rep.label}>
        <BarList rows={personRows} colorFor={null} />
      </ChartCard>

      <ChartCard title="Units Sold by Stream" subtitle={rep.label}>
        <BarList rows={unitRows} colorFor={(r) => DIV_COLOR[r.division] || "#B8860B"} />
      </ChartCard>

      <ChartCard title="Commission by Team Member" subtitle={window.label}>
        <BarList rows={commissionRows} colorFor={null} />
      </ChartCard>

      <ChartCard title="What Production Is Worth" subtitle="Collected vs still owed across the ledger">
        <div className="cg">
          <div className="ci ci-hero">
            <div className="ci-lbl">Collected</div>
            <div className="ci-val">{$$(sales.reduce((s, x) => s + saleCollected(x), 0))}</div>
          </div>
          <div className="ci">
            <div className="ci-lbl">Still owed by clients</div>
            <div className="ci-val">{$$(sales.reduce((s, x) => s + saleOutstanding(x), 0))}</div>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ SETTINGS TAB ══ */

function TierSettings({ data, setData }) {
  const commission = data.ops.commission;
  const setCommission = (patch) =>
    setData((d) => ({ ...d, ops: { ...d.ops, commission: { ...d.ops.commission, ...patch } } }));

  const setTier = (idx, patch) =>
    setCommission({ tiers: commission.tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)) });

  const tiers = usableTiers(commission);
  const example = tiers[2]?.min ?? tiers[1]?.min ?? 5000;
  const flatExample = commissionOn(example * 1.2, { ...commission, mode: "flat" }).commission;
  const margExample = commissionOn(example * 1.2, { ...commission, mode: "marginal" }).commission;

  /* thresholds must climb */
  const outOfOrder = commission.tiers.some((t, i) => {
    if (i === 0) return false;
    const prev = commission.tiers[i - 1];
    if (String(t.minCollected).trim() === "" || String(prev.minCollected).trim() === "") return false;
    return n(t.minCollected) <= n(prev.minCollected);
  });

  return (
    <>
      <div className="sect-lbl">Commission Tiers</div>
      <div className="setlist">
        {commission.tiers.map((t, i) => (
          <div className="setrow" key={t.id}>
            <div className="setname">{t.name}</div>
            <div className="setgrid">
              <label className="field">
                <span className="field-lbl">Rate %</span>
                <input className="input" type="number" inputMode="decimal" value={t.rate}
                  onChange={(e) => setTier(i, { rate: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-lbl">Commissionable sales collected ($)</span>
                <input className="input" type="number" inputMode="decimal"
                  placeholder={i === 0 ? "0" : "Set a threshold"}
                  value={t.minCollected} disabled={i === 0}
                  onChange={(e) => setTier(i, { minCollected: e.target.value })} />
              </label>
            </div>
          </div>
        ))}
      </div>
      {outOfOrder && <div className="ops-warn">Each tier's threshold must be higher than the one before it.</div>}

      <div className="sect-lbl">How higher tiers pay</div>
      <div className="setlist">
        <div className="setrow">
          <button className={"chip chip-btn" + (commission.mode === "marginal" ? " chip-gold" : "")}
            onClick={() => setCommission({ mode: "marginal" })}>
            Only on dollars above each threshold
          </button>
          <button className={"chip chip-btn" + (commission.mode === "flat" ? " chip-gold" : "")}
            onClick={() => setCommission({ mode: "flat" })}>
            On all dollars once the tier is reached
          </button>
        </div>
      </div>
      <div className="example">
        <div className="example-grid">
          <div><span className="pl-l">Also works for</span><span className="pl-v">{$$(example * 1.2)} collected</span></div>
          <div><span className="pl-l">Marginal</span><span className="pl-v">{$$c(margExample)}</span></div>
          <div><span className="pl-l">Flat</span><span className="pl-v">{$$c(flatExample)}</span></div>
        </div>
      </div>

      <div className="g2">
        <label className="field">
          <span className="field-lbl">Tiers reset every</span>
          <select className="input" value={commission.resetPeriod}
            onChange={(e) => setCommission({ resetPeriod: e.target.value })}>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
          </select>
        </label>
        <div className="field">
          <span className="field-lbl">Refunds reduce commission</span>
          <YesNo value={commission.clawbackRefunds} onChange={(v) => setCommission({ clawbackRefunds: v })} />
        </div>
      </div>
    </>
  );
}

function CommissionPlanCard({ plan, data, setData }) {
  const [open, setOpen] = useState(false);
  const assigned = data.people.filter((p) => p.commissionPlanId === plan.id);

  const set = (patch) =>
    setData((d) => ({
      ...d, ops: { ...d.ops, commissionPlans: d.ops.commissionPlans.map((x) => (x.id === plan.id ? { ...x, ...patch } : x)) },
    }));
  const setTier = (idx, patch) =>
    set({ tiers: plan.tiers.map((t, i) => (i === idx ? { ...t, ...patch } : t)) });

  const tiers = usableTiers(plan);
  const sample = tiers[tiers.length - 1]?.min ? tiers[tiers.length - 1].min * 1.4 : 10000;
  const marg = commissionOn(sample, { ...plan, mode: "marginal" }).commission;
  const flat = commissionOn(sample, { ...plan, mode: "flat" }).commission;
  const effective = sample > 0 ? ((plan.mode === "flat" ? flat : marg) / sample) * 100 : 0;

  const outOfOrder = plan.tiers.some((t, i) => {
    if (i === 0) return false;
    const prev = plan.tiers[i - 1];
    if (String(t.minCollected).trim() === "" || String(prev.minCollected).trim() === "") return false;
    return n(t.minCollected) <= n(prev.minCollected);
  });

  return (
    <div className="card">
      <div className="card-head" onClick={() => setOpen(!open)}>
        <div className="card-head-left">
          <div className="card-name-row">
            <span className="card-name">{plan.name}</span>
            <span className="chip">{plan.mode === "flat" ? "Flat" : "Progressive"}</span>
          </div>
          <div className="card-meta">
            <span>{tiers.map((t) => `${t.rate}%`).join(" / ") || "no tiers"}</span>
            <span>{assigned.length} assigned</span>
          </div>
        </div>
        <span className={"chevron" + (open ? " open" : "")}>▾</span>
      </div>

      {open && (
        <div className="card-body">
          <label className="field">
            <span className="field-lbl">Plan name</span>
            <input className="input" value={plan.name} onChange={(e) => set({ name: e.target.value })} />
          </label>

          <div className="sect-lbl">Tiers</div>
          {plan.tiers.map((t, i) => (
            <div className="setrow" key={t.id}>
              <div className="setname">
                {t.name}
                {t.enabled === false && <span className="chip"> Disabled</span>}
              </div>
              <div className="setgrid">
                <label className="field">
                  <span className="field-lbl">Tier name</span>
                  <input className="input" value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} />
                </label>
                <label className="field">
                  <span className="field-lbl">Rate %</span>
                  <input className="input" type="number" inputMode="decimal" step="0.25" value={t.rate}
                    onChange={(e) => setTier(i, { rate: e.target.value })} />
                </label>
              </div>
              <label className="field">
                <span className="field-lbl">Collected from ($)</span>
                <input className="input" type="number" inputMode="decimal"
                  placeholder={i === 0 ? "0" : "Set a threshold"}
                  value={t.minCollected} disabled={i === 0}
                  onChange={(e) => setTier(i, { minCollected: e.target.value })} />
              </label>
              <div className="btn-row">
                <button className="btn-sm" onClick={() => setTier(i, { enabled: t.enabled === false })}>
                  {t.enabled === false ? "Enable" : "Disable"}
                </button>
                {i > 0 && (
                  <button className="btn-sm" onClick={() => set({ tiers: plan.tiers.filter((_, k) => k !== i) })}>
                    Delete tier
                  </button>
                )}
              </div>
            </div>
          ))}
          <button className="btn-sm" onClick={() => set({ tiers: [...plan.tiers, blankTier(`Tier ${plan.tiers.length + 1}`, 0)] })}>
            + Add tier
          </button>

          {outOfOrder && <div className="ops-warn">Each threshold must be higher than the one before it.</div>}

          <div className="sect-lbl">How higher tiers pay</div>
          <div className="btn-row">
            <button className={"chip chip-btn" + (plan.mode === "marginal" ? " chip-gold" : "")}
              onClick={() => set({ mode: "marginal" })}>Progressive — each band at its own rate</button>
            <button className={"chip chip-btn" + (plan.mode === "flat" ? " chip-gold" : "")}
              onClick={() => set({ mode: "flat" })}>Flat — top rate on everything</button>
          </div>

          <div className="example">
            <div className="example-grid">
              <div><span className="pl-l">At</span><span className="pl-v">{$$(sample)} collected</span></div>
              <div><span className="pl-l">Progressive</span><span className="pl-v">{$$c(marg)}</span></div>
              <div><span className="pl-l">Flat</span><span className="pl-v">{$$c(flat)}</span></div>
              <div><span className="pl-l">Effective rate</span><span className="pl-v">{pctText(effective)}</span></div>
            </div>
          </div>

          <div className="g2">
            <label className="field">
              <span className="field-lbl">Tiers reset every</span>
              <select className="input" value={plan.resetPeriod} onChange={(e) => set({ resetPeriod: e.target.value })}>
                <option value="month">Month</option>
                <option value="quarter">Quarter</option>
              </select>
            </label>
            <label className="field">
              <span className="field-lbl">Effective date</span>
              <input className="input" type="date" value={plan.effectiveDate}
                onChange={(e) => set({ effectiveDate: e.target.value })} />
            </label>
          </div>

          <div className="settings-row">
            <span>Refunds reduce commission</span>
            <YesNo value={plan.clawbackRefunds} onChange={(v) => set({ clawbackRefunds: v })} />
          </div>

          {assigned.length > 0 && (
            <div className="card-meta">
              <span>Assigned to {assigned.map((p) => p.name || "Unnamed").join(", ")}</span>
            </div>
          )}

          <button className="btn-danger" onClick={() => {
            if (window.confirm(`Delete "${plan.name}"? Anyone on it falls back to the default rates.`))
              setData((d) => ({ ...d, ops: { ...d.ops, commissionPlans: d.ops.commissionPlans.filter((x) => x.id !== plan.id) } }));
          }}>Delete plan</button>
        </div>
      )}
    </div>
  );
}

function OverridePlanCard({ plan, data, setData }) {
  const [open, setOpen] = useState(false);
  const assigned = data.people.filter((p) => p.overridePlanId === plan.id);
  const set = (patch) =>
    setData((d) => ({
      ...d, ops: { ...d.ops, overridePlans: d.ops.overridePlans.map((x) => (x.id === plan.id ? { ...x, ...patch } : x)) },
    }));

  return (
    <div className="card">
      <div className="card-head" onClick={() => setOpen(!open)}>
        <div className="card-head-left">
          <div className="card-name-row">
            <span className="card-name">{plan.name}</span>
            <span className="chip chip-gold">{plan.rate}%</span>
            {!plan.enabled && <span className="chip">Off</span>}
          </div>
          <div className="card-meta">
            <span>{plan.excludeOwnSales ? "Own sales excluded" : "Own sales included"}</span>
            <span>{assigned.length} assigned</span>
          </div>
        </div>
        <span className={"chevron" + (open ? " open" : "")}>▾</span>
      </div>

      {open && (
        <div className="card-body">
          <div className="g2">
            <label className="field">
              <span className="field-lbl">Plan name</span>
              <input className="input" value={plan.name} onChange={(e) => set({ name: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-lbl">Override rate %</span>
              <input className="input" type="number" inputMode="decimal" step="0.25" value={plan.rate}
                onChange={(e) => set({ rate: e.target.value })} />
            </label>
          </div>

          <div className="settings-row">
            <span>Plan active</span>
            <YesNo value={plan.enabled} onChange={(v) => set({ enabled: v })} />
          </div>
          <div className="settings-row">
            <span>Exclude their own sales</span>
            <YesNo value={plan.excludeOwnSales} onChange={(v) => set({ excludeOwnSales: v })} />
          </div>

          {!plan.excludeOwnSales && (
            <div className="ops-warn">
              With their own sales included, a leader earns personal commission and the override
              on the same dollar. That is paying twice for one sale.
            </div>
          )}

          <div className="g2">
            <label className="field">
              <span className="field-lbl">Minimum team revenue ($)</span>
              <input className="input" type="number" inputMode="decimal" placeholder="No minimum"
                value={plan.minTeamRevenue} onChange={(e) => set({ minTeamRevenue: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-lbl">Effective date</span>
              <input className="input" type="date" value={plan.effectiveDate}
                onChange={(e) => set({ effectiveDate: e.target.value })} />
            </label>
          </div>

          <div className="settings-row">
            <span>Pay only on revenue above that minimum</span>
            <YesNo value={plan.aboveThresholdOnly} onChange={(v) => set({ aboveThresholdOnly: v })} />
          </div>

          <p className="hint-xs">
            The override pays on commissionable collected revenue from people on teams this
            person leads, or on any team in a division they lead.
          </p>

          <button className="btn-danger" onClick={() => {
            if (window.confirm(`Delete "${plan.name}"?`))
              setData((d) => ({ ...d, ops: { ...d.ops, overridePlans: d.ops.overridePlans.filter((x) => x.id !== plan.id) } }));
          }}>Delete plan</button>
        </div>
      )}
    </div>
  );
}

function CompensationSettings({ data, setData }) {
  const setPerson = (id, patch) =>
    setData((d) => ({ ...d, people: d.people.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const setEligibility = (p, key, value) =>
    setPerson(p.id, { eligibility: { ...p.eligibility, [key]: value } });

  return (
    <>
      <div className="row-between">
        <div className="sect-lbl">Commission Plans</div>
        <button className="btn-sm" onClick={() => setData((d) => ({
          ...d, ops: { ...d.ops, commissionPlans: [...d.ops.commissionPlans, blankCommissionPlan()] },
        }))}>+ Add plan</button>
      </div>
      {(data.ops.commissionPlans || []).map((plan) => (
        <CommissionPlanCard key={plan.id} plan={plan} data={data} setData={setData} />
      ))}

      <div className="row-between">
        <div className="sect-lbl">Leadership Override Plans</div>
        <button className="btn-sm" onClick={() => setData((d) => ({
          ...d, ops: { ...d.ops, overridePlans: [...d.ops.overridePlans, blankOverridePlan()] },
        }))}>+ Add plan</button>
      </div>
      {(data.ops.overridePlans || []).map((plan) => (
        <OverridePlanCard key={plan.id} plan={plan} data={data} setData={setData} />
      ))}

      <div className="sect-lbl">Who Is On What</div>
      {data.people.length === 0 ? (
        <p className="hint-sm">Add team members on the Team tab first.</p>
      ) : (
        <div className="setlist">
          {data.people.map((p) => (
            <div className="setrow" key={p.id}>
              <div className="setname">{p.name || "Unnamed"}</div>
              <div className="setgrid">
                <label className="field">
                  <span className="field-lbl">Compensation type</span>
                  <select className="input" value={p.compType} onChange={(e) => setPerson(p.id, { compType: e.target.value })}>
                    {COMP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="field-lbl">Commission plan</span>
                  <select className="input" value={p.commissionPlanId}
                    onChange={(e) => setPerson(p.id, { commissionPlanId: e.target.value })}>
                    <option value="">Default rates</option>
                    {(data.ops.commissionPlans || []).map((pl) => (
                      <option key={pl.id} value={pl.id}>{pl.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                <span className="field-lbl">Leadership override plan</span>
                <select className="input" value={p.overridePlanId}
                  onChange={(e) => setPerson(p.id, { overridePlanId: e.target.value })}>
                  <option value="">None</option>
                  {(data.ops.overridePlans || []).map((pl) => (
                    <option key={pl.id} value={pl.id}>{pl.name} ({pl.rate}%)</option>
                  ))}
                </select>
              </label>

              <div className="settings-row"><span>Personal commission</span>
                <YesNo value={p.eligibility.commission} onChange={(v) => setEligibility(p, "commission", v)} /></div>
              <div className="settings-row"><span>Leadership override</span>
                <YesNo value={p.eligibility.override} onChange={(v) => setEligibility(p, "override", v)} /></div>
              <div className="settings-row"><span>Company bonus</span>
                <YesNo value={p.eligibility.companyBonus} onChange={(v) => setEligibility(p, "companyBonus", v)} /></div>
              <div className="settings-row"><span>Team bonus pool</span>
                <YesNo value={p.eligibility.teamPool} onChange={(v) => setEligibility(p, "teamPool", v)} /></div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function BridgeSettings({ data, setData }) {
  const bridge = data.ops.bridge || defaultBridge();
  const set = (patch) =>
    setData((d) => ({ ...d, ops: { ...d.ops, bridge: { ...d.ops.bridge, ...patch } } }));

  return (
    <>
      <div className="sect-lbl">Team → Sales Bridge</div>
      <p className="hint-sm">
        Turns units entered on the Team tab into sale records, so they reach the
        ledger, commissions and tiers without anyone entering the sale twice.
      </p>

      <div className="settings-row">
        <span>Units become sales</span>
        <YesNo value={bridge.enabled} onChange={(v) => set({ enabled: v })} />
      </div>
      <div className="settings-row">
        <span>Generated sales are commissionable</span>
        <YesNo value={bridge.commissionableDefault} onChange={(v) => set({ commissionableDefault: v })} />
      </div>
      <div className="settings-row">
        <span>Count them as collected immediately</span>
        <YesNo value={bridge.treatAsCollected} onChange={(v) => set({ treatAsCollected: v })} />
      </div>

      {bridge.treatAsCollected ? (
        <div className="ops-warn">
          Commission is being paid on <b>booked</b> revenue, not money in the bank. If a client
          pays late or never pays, the commission has already counted. Switch this off to pay
          only on cash you have actually collected.
        </div>
      ) : (
        <div className="next-callout">
          Generated sales sit in the ledger unpaid until someone records a payment, so
          commission only counts collected cash.
        </div>
      )}
    </>
  );
}

function DivisionSettings({ data, setData }) {
  const setDivision = (id, patch) =>
    setData((d) => ({
      ...d, org: { ...d.org, divisions: d.org.divisions.map((x) => (x.id === id ? { ...x, ...patch } : x)) },
    }));

  return (
    <>
      <div className="row-between">
        <div className="sect-lbl">Divisions</div>
        <button className="btn-sm" onClick={() => setData((d) => ({
          ...d, org: { ...d.org, divisions: [...d.org.divisions, blankDivision("New division")] },
        }))}>+ Add division</button>
      </div>
      <div className="setlist">
        {(data.org.divisions || []).map((div) => (
          <div className="setrow" key={div.id}>
            <div className="setname">
              <span className="divdot" style={{ background: div.color || "#6b6257" }} />{" "}
              {div.name || "Unnamed"}
              {div.archived && <span className="chip"> Archived</span>}
            </div>
            <div className="setgrid">
              <label className="field">
                <span className="field-lbl">Name</span>
                <input className="input" value={div.name} onChange={(e) => setDivision(div.id, { name: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-lbl">Division leader</span>
                <select className="input" value={div.leaderId} onChange={(e) => setDivision(div.id, { leaderId: e.target.value })}>
                  <option value="">Unassigned</option>
                  {data.people.map((p) => <option key={p.id} value={p.id}>{p.name || "Unnamed"}</option>)}
                </select>
              </label>
            </div>
            <div className="btn-row">
              <button className="btn-sm" onClick={() => setDivision(div.id, { archived: !div.archived })}>
                {div.archived ? "Restore" : "Archive"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="hint-xs">
        Archiving hides a division from pickers and rollups. Its history is kept — nothing is deleted.
      </p>
    </>
  );
}

function TeamSettings({ data, setData }) {
  const setTeam = (id, patch) =>
    setData((d) => ({ ...d, org: { ...d.org, teams: d.org.teams.map((x) => (x.id === id ? { ...x, ...patch } : x)) } }));

  return (
    <>
      <div className="row-between">
        <div className="sect-lbl">Teams</div>
        <button className="btn-sm" onClick={() => setData((d) => ({
          ...d, org: { ...d.org, teams: [...d.org.teams, blankTeam(divisionList(d)[0]?.id || "", "New team")] },
        }))}>+ Add team</button>
      </div>
      {(data.org.teams || []).length === 0 ? (
        <p className="hint-sm">No teams yet. A division can hold as many teams as you need.</p>
      ) : (
        <div className="setlist">
          {data.org.teams.map((team) => (
            <div className="setrow" key={team.id}>
              <div className="setname">
                {team.name || "Unnamed team"}
                {team.archived && <span className="chip"> Archived</span>}
              </div>
              <div className="setgrid">
                <label className="field">
                  <span className="field-lbl">Name</span>
                  <input className="input" value={team.name} onChange={(e) => setTeam(team.id, { name: e.target.value })} />
                </label>
                <label className="field">
                  <span className="field-lbl">Division</span>
                  <select className="input" value={team.divisionId} onChange={(e) => setTeam(team.id, { divisionId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {divisionList(data).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </label>
              </div>
              <label className="field">
                <span className="field-lbl">Team leader</span>
                <select className="input" value={team.leaderId} onChange={(e) => setTeam(team.id, { leaderId: e.target.value })}>
                  <option value="">Unassigned</option>
                  {membersInTeam(data, team.id).map((p) => <option key={p.id} value={p.id}>{p.name || "Unnamed"}</option>)}
                  {data.people.filter((p) => p.teamId !== team.id).map((p) => (
                    <option key={p.id} value={p.id}>{p.name || "Unnamed"} (other team)</option>
                  ))}
                </select>
              </label>
              <div className="card-meta">
                <span>{membersInTeam(data, team.id).length} member{membersInTeam(data, team.id).length === 1 ? "" : "s"}</span>
              </div>
              <div className="btn-row">
                <button className="btn-sm" onClick={() => setTeam(team.id, { archived: !team.archived })}>
                  {team.archived ? "Restore" : "Archive"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function MemberOrgSettings({ data, setData }) {
  const setPerson = (id, patch) =>
    setData((d) => ({ ...d, people: d.people.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  return (
    <>
      <div className="sect-lbl">Team Members · Placement</div>
      {data.people.length === 0 ? (
        <p className="hint-sm">Add team members on the Team tab first.</p>
      ) : (
        <div className="setlist">
          {data.people.map((p) => (
            <div className="setrow" key={p.id}>
              <div className="setname">
                {p.name || "Unnamed"}
                {!p.active && <span className="chip"> Inactive</span>}
              </div>
              <div className="setgrid">
                <label className="field">
                  <span className="field-lbl">Division</span>
                  <select className="input" value={p.divisionId}
                    onChange={(e) => setPerson(p.id, { divisionId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {divisionList(data).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="field-lbl">Team</span>
                  <select className="input" value={p.teamId}
                    onChange={(e) => {
                      const team = teamById(data, e.target.value);
                      setPerson(p.id, {
                        teamId: e.target.value,
                        divisionId: team?.divisionId || p.divisionId,
                      });
                    }}>
                    <option value="">Unassigned</option>
                    {teamList(data).map((t) => (
                      <option key={t.id} value={t.id}>{t.name || "Unnamed team"}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="setgrid">
                <label className="field">
                  <span className="field-lbl">Department</span>
                  <select className="input" value={p.department}
                    onChange={(e) => setPerson(p.id, { department: e.target.value })}>
                    {DEPARTMENTS.map((dep) => <option key={dep} value={dep}>{dep}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="field-lbl">System role</span>
                  <select className="input" value={p.systemRole}
                    onChange={(e) => setPerson(p.id, { systemRole: e.target.value })}>
                    {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                  </select>
                </label>
              </div>
              <div className="setgrid">
                <label className="field">
                  <span className="field-lbl">Start date</span>
                  <input className="input" type="date" value={p.startDate}
                    onChange={(e) => setPerson(p.id, { startDate: e.target.value })} />
                </label>
                <div className="field">
                  <span className="field-lbl">Active</span>
                  <YesNo value={p.active} onChange={(v) => setPerson(p.id, { active: v })} />
                </div>
              </div>
              <label className="field">
                <span className="field-lbl">Notes</span>
                <input className="input" placeholder="Optional" value={p.notes}
                  onChange={(e) => setPerson(p.id, { notes: e.target.value })} />
              </label>
            </div>
          ))}
        </div>
      )}
      <p className="hint-xs">
        Moving someone between teams changes this one record — their history and sales credit stay with them.
      </p>
    </>
  );
}

function SettingsTab({ data, setData, onReset, today }) {
  const [exportNote, setExportNote] = useState("");

  const exportCsv = async () => {
    const rows: any[] = [];
    rows.push(["Week Start", "Week End", "Division", "Stream", "Type", "Price", "Units", "Revenue", "Goal"]);
    allWeekRecords(data).forEach((w) => {
      (w.streams || []).forEach((s) => {
        rows.push([w.weekStart, w.weekEnd, s.division, s.name, s.revenueType, s.price, s.units, s.revenue, s.goal]);
      });
    });
    rows.push([]);
    rows.push(["Sale Date", "Client", "Division", "Product", "Amount", "Collected", "Commissionable", "Credited To", "Source"]);
    allSales(data).forEach((s) => {
      const names = saleCredits(s)
        .map((c) => `${data.people.find((p) => p.id === c.memberId)?.name || "?"} (${c.share}%)`)
        .join(" / ");
      rows.push([s.dateSold, s.clientName, divisionName(data, s.divisionId), s.product,
        n(s.saleAmount), saleCollected(s), s.commissionable ? "Yes" : "No", names, s.derived ? "Team tab" : "Manual"]);
    });
    rows.push([]);
    rows.push(["Member", "Period", "Commissionable Collected", "Tier", "Effective Rate", "Commission"]);
    data.people.forEach((p) => {
      memberSummary(data, p.id, today).windows.forEach((w: any) => {
        rows.push([p.name, w.label, w.base.toFixed(2), w.tier ? w.tier.name : "—",
          w.effectiveRate.toFixed(2), w.commission.toFixed(2)]);
      });
    });

    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const filename = `model-luxe-revenue-${isoD(today)}.csv`;

    /* In the hosted preview the page has to hand the file over through the
       viewer's own save prompt; in the deployed app a plain link works. */
    const claude = (window as any).claude;
    if (claude?.use) {
      try {
        const downloads = await claude.use("downloads");
        if (downloads) {
          setExportNote("");
          try {
            await downloads.save({ filename, data: csv });
            setExportNote("Exported.");
          } catch (err: any) {
            setExportNote(err?.code === "declined" ? "Export cancelled." : "Export unavailable here.");
          }
          return;
        }
      } catch {}
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    setExportNote("Exported.");
  };

  return (
    <div className="tab-body">
      <div className="sect-lbl">Company</div>
      <label className="field">
        <span className="field-lbl">Company name</span>
        <input className="input" value={data.companyName}
          onChange={(e) => setData((d) => ({ ...d, companyName: e.target.value }))} />
      </label>
      <label className="field">
        <span className="field-lbl">Week starting (Monday)</span>
        <input className="input" type="date" value={data.activeWeekStart}
          onChange={(e) => setData((d) => ({ ...d, activeWeekStart: isoD(startOfWeek(parseD(e.target.value))) }))} />
      </label>

      <DivisionSettings data={data} setData={setData} />
      <TeamSettings data={data} setData={setData} />
      <MemberOrgSettings data={data} setData={setData} />
      <BridgeSettings data={data} setData={setData} />
      <CompensationSettings data={data} setData={setData} />

      <div className="sect-lbl">Team Members · Divisions & Eligibility</div>
      {data.people.length === 0 ? (
        <p className="hint-sm">Add team members on the Team tab first.</p>
      ) : (
        <div className="setlist">
          {data.people.map((p) => (
            <div className="setrow" key={p.id}>
              <div className="setname">{p.name || "Unnamed"}</div>
              <div className="checks">
                {divisionList(data).map((d) => {
                  const on = (p.divisionIds || []).includes(d.id);
                  return (
                    <span key={d.id} className={"chip chip-btn" + (on ? " chip-gold" : "")}
                      onClick={() => setData((prev) => ({
                        ...prev,
                        people: prev.people.map((x) => x.id === p.id
                          ? { ...x, divisionIds: on ? x.divisionIds.filter((i) => i !== d.id) : [...(x.divisionIds || []), d.id] }
                          : x),
                      }))}>
                      {d.name}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sect-lbl">Week History</div>
      {(data.history?.weeks || []).length === 0 ? (
        <p className="hint-sm">No closed weeks yet.</p>
      ) : (
        <div className="histlist">
          {[...data.history.weeks].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1)).map((w) => (
            <div className="histrow" key={w.id}>
              <div className="histmain">
                <div className="histwk">Week {w.weekNumber} · {w.year}</div>
                <div className="histdates">{w.weekStart} → {w.weekEnd}</div>
              </div>
              <div className="histrev">{$$((w.streams || []).reduce((s, x) => s + n(x.revenue), 0))}</div>
              <button className="histdel" onClick={() => {
                if (window.confirm("Delete this saved week? This cannot be undone."))
                  setData((d) => ({ ...d, history: { weeks: d.history.weeks.filter((x) => x.id !== w.id) } }));
              }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="sect-lbl">Data</div>
      <div className="btn-row">
        <button className="btn-secondary" onClick={exportCsv}>Export CSV</button>
        <button className="btn-danger" onClick={onReset}>Start from scratch</button>
      </div>
      {exportNote && <p className="hint-xs">{exportNote}</p>}
      <p className="storage-note">
        Storage: this browser only. Nothing leaves your device, and clearing site data clears the dashboard.
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ APP SHELL ══ */

function AppStyles() {
  return <style dangerouslySetInnerHTML={{ __html: APP_CSS }} />;
}

export default function App() {
  const [data, setData]     = useState<any>(null);
  const [tab, setTab]       = useState("rev");
  const [save, setSave]     = useState("saved");
  const [type, setType]     = useState("week");
  const [offset, setOffset] = useState(0);
  const timer = useRef<any>(null);
  const ready = useRef(false);
  const today = new Date();

  useEffect(() => {
    setData(migrate(loadSaved()));
    setTimeout(() => { ready.current = true; }, 50);
  }, []);

  useEffect(() => {
    if (!data || !ready.current) return;
    setSave("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(data).then(() => setSave("saved")), 700);
  }, [data]);

  const closeWeek = () => {
    const ws = data.activeWeekStart || isoD(startOfWeek(today));
    const snap = buildSnapshot(data, ws);
    const rev = snap.streams.reduce((s, st) => s + n(st.revenue), 0);
    const dupe = (data.history?.weeks || []).some((w) => w.weekStart === ws);

    const msg =
      `Close the week of ${snap.weekStart} → ${snap.weekEnd}?\n\n` +
      `Revenue: ${$$(rev)}\n` +
      `Deals: ${snap.people.reduce((s, p) => s + n(p.deals), 0)}\n` +
      `Units: ${snap.streams.reduce((s, st) => s + n(st.units), 0)}\n\n` +
      (dupe ? "⚠️ A snapshot for this week already exists — a second one will be added.\n\n" : "") +
      `This saves a permanent snapshot, then clears the funnel and unit counts to start a fresh week. ` +
      `Prices, goals, streams, and team members are kept. Sales already in the ledger are never touched. ` +
      `History is never deleted.`;

    if (!window.confirm(msg)) return;

    const closedStart = parseD(ws);
    const nextStart = new Date(Math.max(addDays(closedStart, 7).getTime(), startOfWeek(today).getTime()));

    setData((d) => ({
      ...d,
      history: { weeks: [...(d.history?.weeks || []), snap] },
      activeWeekStart: isoD(startOfWeek(nextStart)),
      streams: d.streams.map((s) => ({ ...s, houseQty: "" })),
      people: d.people.map((p) => ({
        ...p, contacted: "", conversations: "", offers: "", dealsClosed: "", lines: {},
      })),
    }));
    setType("week"); setOffset(0);
  };

  if (!data) {
    return <div className="loading"><AppStyles /><div className="spinner" /><p>Loading…</p></div>;
  }

  return (
    <div className="root">
      <AppStyles />
      <header className="hdr">
        <div>
          <div className="eyebrow">Revenue Dashboard</div>
          <div className="hdr-name">{data.companyName || "Model Luxe Media"}</div>
        </div>
        <div className={"save-dot " + save}>{save === "saving" ? "Saving…" : "Saved ✓"}</div>
      </header>

      <nav className="nav">
        {[["rev","Revenue"],["team","Team"],["sales","Sales"],["org","Org"],["comm","Commissions"],["charts","Charts"],["settings","Settings"]]
          .map(([id, label]) => (
            <button key={id} className={"nav-btn" + (tab === id ? " nav-active" : "")}
              onClick={() => setTab(id)}>{label}</button>
          ))}
      </nav>

      <main className="main">
        {tab === "rev" && (
          <RevenueTab data={data} setData={setData} today={today}
            type={type} offset={offset} setType={setType} setOffset={setOffset}
            onCloseWeek={closeWeek} />
        )}
        {tab === "team" && <TeamTab data={data} setData={setData} today={today} />}
        {tab === "sales" && <SalesTab data={data} setData={setData} today={today} />}
        {tab === "org" && <OrgTab data={data} setData={setData} today={today} />}
        {tab === "comm" && (
          <CommissionsTab data={data} setData={setData} today={today}
            goToSettings={() => setTab("settings")} />
        )}
        {tab === "charts" && (
          <ChartsTab data={data} today={today}
            type={type} offset={offset} setType={setType} setOffset={setOffset} />
        )}
        {tab === "settings" && (
          <SettingsTab data={data} setData={setData} today={today}
            onReset={() => {
              if (window.confirm("Clear ALL data including saved week history and the sales ledger? This cannot be undone."))
                setData(defaultData());
            }} />
        )}
      </main>
    </div>
  );
}
