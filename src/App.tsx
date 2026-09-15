import React, { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, Legend, CartesianGrid,
} from "recharts";
import {
  Plus, Trash2, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Download, Printer, RotateCcw, AlertCircle, Zap, Archive,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════ DIVISIONS ══ */

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

const REVENUE_TYPES = ["one-time", "recurring", "commission"];

/* ═══════════════════════════════════════════════════════════ CATALOG ══ */

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
      { name: "Expo Revenue",            prices: [],              type: "one-time" },
      { name: "Expo Package — Standard", prices: [695, 495],      type: "one-time" },
      { name: "Expo Package — Premium",  prices: [995, 795, 1195],type: "one-time" },
      { name: "Convention Bundle",       prices: [895, 1195],     type: "one-time" },
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

const STARTER = [
  ["New Talent Onboarding",     "42 Model Management", [275, 195, 395],        "one-time"],
  ["Academy Package",           "Model Way Academy",   [695, 495, 995],        "one-time"],
  ["Saturday Classes",          "Model Way Academy",   [75, 100, 125],         "one-time"],
  ["Photography",               "Luxe Productions",    [350, 500, 750, 1000],  "one-time"],
  ["Website Recurring Revenue", "42 Model Management", [12, 15, 20, 25],       "recurring"],
  ["Expo Revenue",              "Expos & Conventions", [],                     "one-time"],
];

/* ═══════════════════════════════════════════════════════════ HELPERS ══ */

const KEY = "mlm-calc-v7";
const uid = () => Math.random().toString(36).slice(2, 10);
const n   = (v) => (v === "" || v == null || isNaN(+v) ? 0 : +v);
const $$  = (v) => "$" + n(v).toLocaleString("en-US", { maximumFractionDigits: 0 });

/* ── SAFE PERCENTAGE — never Infinity, never NaN, never a runaway figure ── */
function safePct(numerator, denominator) {
  const d = n(denominator);
  if (d <= 0) return null;
  const r = (n(numerator) / d) * 100;
  return isFinite(r) ? r : null;
}
function pctText(v, digits = 1) {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  if (v > 9999) return ">9999%";
  return v.toFixed(digits) + "%";
}
/* Signed change, for period-over-period comparison */
function pctChange(current, previous) {
  const p = n(previous);
  if (p <= 0) return null;
  const r = ((n(current) - p) / p) * 100;
  return isFinite(r) ? r : null;
}
function changeText(v) {
  if (v === null) return "—";
  const s = v >= 0 ? "+" : "";
  if (Math.abs(v) > 9999) return v >= 0 ? ">+9999%" : "<-9999%";
  return s + v.toFixed(1) + "%";
}
const barWidth = (v) => (v === null ? 0 : Math.max(0, Math.min(100, v)));

/* ═══════════════════════════════════════════════════════ DATE ENGINE ══ */

const MONTHS_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const pad2  = (x) => String(x).padStart(2, "0");
const isoD  = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseD = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, k) => { const x = new Date(d); x.setDate(x.getDate() + k); return x; };

/* Weeks run Monday → Sunday */
function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function isoWeekNum(d) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const wk1 = new Date(t.getFullYear(), 0, 4);
  return 1 + Math.round(((t - wk1) / 86400000 - 3 + ((wk1.getDay() + 6) % 7)) / 7);
}
const quarterOf = (month) => Math.floor(month / 3) + 1;

/* Range for a reporting period. offset 0 = current, 1 = previous, … */
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
    const q0 = Math.floor(today.getMonth() / 3) * 3;
    const s = new Date(today.getFullYear(), q0 - 3 * offset, 1);
    return { start: s, end: new Date(s.getFullYear(), s.getMonth() + 3, 0) };
  }
  const s = new Date(today.getFullYear() - offset, 0, 1);
  return { start: s, end: new Date(s.getFullYear(), 11, 31) };
}
function periodLabel(type, offset, today) {
  const { start, end } = periodRange(type, offset, today);
  if (type === "week")
    return `Week ${isoWeekNum(start)} · ${MONTHS_S[start.getMonth()]} ${start.getDate()}–${MONTHS_S[end.getMonth()]} ${end.getDate()}`;
  if (type === "month")   return `${MONTHS_S[start.getMonth()]} ${start.getFullYear()}`;
  if (type === "quarter") return `Q${quarterOf(start.getMonth())} ${start.getFullYear()}`;
  return String(start.getFullYear());
}
const PERIOD_NOUN = { week: "Week", month: "Month", quarter: "Quarter", year: "Year" };

/* ═══════════════════════════════════════════════════════════ STORAGE ══
 * Saves this dashboard in the current browser. This works on Vercel and
 * other standard web hosts without relying on Claude-specific APIs.
 * ═══════════════════════════════════════════════════════════════════ */

async function load() {
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}
async function persist(d) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(d));
  } catch {}
}

/* ═══════════════════════════════════════════════════════ DATA SHAPES ══ */

const defaultData = () => ({
  companyName: "Model Luxe Media",
  companyGoal: "",                 // goal for ONE week (the active period)
  streams: [],
  people:  [],
  history: { weeks: [] },
  activeWeekStart: isoD(startOfWeek(new Date())),
});

const blankStream = (name = "", prices = [], division = "Other / Custom", revenueType = "one-time") => ({
  id: uid(), name, division, revenueType,
  catalogPrices: prices,
  selectedPrice: prices.length ? String(prices[0]) : "",
  priceMode:     prices.length ? "preset" : "custom",
  customPrice:   "",
  companyGoal: "",
  houseQty: "",
});

/* Funnel: Activity → Conversation → Offer → Deal → Revenue */
const blankPerson = () => ({
  id: uid(), name: "", role: "",
  contacted: "", conversations: "", offers: "", dealsClosed: "",
  weeklyGoal: "",
  lines: {},          // streamId → { qty }
});

/* ═══════════════════════════════════════════════════ CALCULATIONS ══ */

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
    avgTransaction: deals > 0 ? revenue / deals : null,   // revenue ÷ DEALS, not units
    pctOfGoal:      safePct(revenue, goal),
    remaining:      Math.max(0, goal - revenue),
  };
}

/* ── Build a full-detail snapshot of the active week ──────────────────
   Stores enough granularity to recreate stream / division / person
   rollups for any future month, quarter, or year report.            */
function buildSnapshot(data, weekStartISO) {
  const start = parseD(weekStartISO);
  const end   = addDays(start, 6);

  const streams = data.streams.map((st) => {
    const c = calcStream(st, data.people);
    return {
      id: st.id, name: st.name, division: st.division || "Other / Custom",
      revenueType: st.revenueType || "one-time",
      price: c.price, goal: c.goal, units: c.totalQty,
      houseUnits: c.houseQty, teamUnits: c.teamQty, revenue: c.revenue,
    };
  });

  const people = data.people.map((p) => {
    const m = calcPerson(p, data.streams);
    return {
      id: p.id, name: p.name, role: p.role,
      contacted: m.contacted, conversations: m.conversations,
      offers: m.offers, deals: m.deals, units: m.units,
      revenue: m.revenue, goal: m.goal,
      lines: Object.fromEntries(
        data.streams.map((st) => [st.id, lineQty(p, st.id)]).filter(([, q]) => q > 0)
      ),
    };
  });

  return {
    id: uid(),
    weekStart: weekStartISO,
    weekEnd: isoD(end),
    weekNumber: isoWeekNum(start),
    month: start.getMonth() + 1,
    quarter: quarterOf(start.getMonth()),
    year: start.getFullYear(),
    closedAt: new Date().toISOString(),
    companyGoal: n(data.companyGoal),
    streams, people,
  };
}

/* Treat the live, un-closed week exactly like a snapshot so every
   report can mix history with the week in progress. */
function activeSnapshot(data) {
  const ws = data.activeWeekStart || isoD(startOfWeek(new Date()));
  return { ...buildSnapshot(data, ws), isActive: true };
}

/* All week records = closed history + the live week */
function allWeekRecords(data) {
  return [...(data.history?.weeks || []), activeSnapshot(data)]
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
}

/* Weeks whose START DATE falls inside the period range */
function weeksInRange(records, range) {
  const s = isoD(range.start), e = isoD(range.end);
  return records.filter((w) => w.weekStart >= s && w.weekStart <= e);
}

/* ── Aggregate any set of week records into one report ── */
function aggregate(weeks) {
  const out = {
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
      out.units   += n(st.units);

      const type = st.revenueType || "one-time";
      if (type === "recurring")       out.recurring  += n(st.revenue);
      else if (type === "commission") out.commission += n(st.revenue);
      else                            out.oneTime    += n(st.revenue);

      const sk = st.name || st.id;
      if (!out.byStream[sk])
        out.byStream[sk] = { name: sk, division: st.division, revenue: 0, goal: 0, units: 0 };
      out.byStream[sk].revenue += n(st.revenue);
      out.byStream[sk].goal    += n(st.goal);
      out.byStream[sk].units   += n(st.units);

      const dk = st.division || "Other / Custom";
      if (!out.byDivision[dk]) out.byDivision[dk] = { name: dk, revenue: 0, goal: 0, units: 0 };
      out.byDivision[dk].revenue += n(st.revenue);
      out.byDivision[dk].goal    += n(st.goal);
      out.byDivision[dk].units   += n(st.units);
    });

    (w.people || []).forEach((p) => {
      out.contacted     += n(p.contacted);
      out.conversations += n(p.conversations);
      out.offers        += n(p.offers);
      out.deals         += n(p.deals);

      const pk = p.name || p.id;
      if (!out.byPerson[pk])
        out.byPerson[pk] = {
          name: pk, role: p.role, revenue: 0, goal: 0, units: 0,
          deals: 0, contacted: 0, conversations: 0, offers: 0,
        };
      const t = out.byPerson[pk];
      t.revenue += n(p.revenue); t.goal += n(p.goal); t.units += n(p.units);
      t.deals += n(p.deals); t.contacted += n(p.contacted);
      t.conversations += n(p.conversations); t.offers += n(p.offers);
    });
  });

  out.pctOfGoal     = safePct(out.revenue, out.goal);
  out.remaining     = Math.max(0, out.goal - out.revenue);
  out.closeRate     = safePct(out.deals, out.contacted);
  out.contactToConvo= safePct(out.conversations, out.contacted);
  out.convoToOffer  = safePct(out.offers, out.conversations);
  out.offerToClose  = safePct(out.deals, out.offers);
  out.avgTransaction= out.deals > 0 ? out.revenue / out.deals : null;
  out.recurringShare= safePct(out.recurring, out.revenue);

  return out;
}

/* Report for a period + its immediately preceding period */
function periodReport(data, type, offset, today) {
  const records = allWeekRecords(data);
  const cur  = aggregate(weeksInRange(records, periodRange(type, offset, today)));
  const prev = aggregate(weeksInRange(records, periodRange(type, offset + 1, today)));
  return { cur, prev, label: periodLabel(type, offset, today),
           prevLabel: periodLabel(type, offset + 1, today),
           range: periodRange(type, offset, today) };
}

/* ── CEO Attention Required — max 5, highest severity first ── */
function attentionItems(data, rep, type) {
  const items = [];
  const { cur, prev } = rep;
  const noun = PERIOD_NOUN[type].toLowerCase();

  // company pace
  if (cur.goal > 0 && cur.pctOfGoal !== null && cur.pctOfGoal < 100) {
    const behind = 100 - cur.pctOfGoal;
    if (behind >= 25)
      items.push({ sev: "red", text: `Company revenue is ${behind.toFixed(0)}% behind the ${noun} target — ${$$(cur.remaining)} still needed.` });
    else if (behind >= 10)
      items.push({ sev: "yellow", text: `Company revenue is ${behind.toFixed(0)}% behind target with ${$$(cur.remaining)} to go.` });
  }
  if (cur.goal > 0 && cur.pctOfGoal !== null && cur.pctOfGoal >= 100)
    items.push({ sev: "green", text: `Company target met — ${pctText(cur.pctOfGoal)} of the ${noun} goal.` });

  // period over period
  const revChange = pctChange(cur.revenue, prev.revenue);
  if (revChange !== null && revChange <= -10)
    items.push({ sev: "red", text: `Revenue is down ${Math.abs(revChange).toFixed(0)}% versus the previous ${noun}.` });
  else if (revChange !== null && revChange >= 15)
    items.push({ sev: "green", text: `Revenue is up ${revChange.toFixed(0)}% versus the previous ${noun}.` });

  // divisions behind / ahead
  Object.values(cur.byDivision).forEach((d) => {
    const p = safePct(d.revenue, d.goal);
    if (d.goal > 0 && p !== null && p < 60)
      items.push({ sev: "red", text: `${d.name} is ${(100 - p).toFixed(0)}% behind its ${noun} target.` });
    else if (d.goal > 0 && p !== null && p >= 100)
      items.push({ sev: "green", text: `${d.name} has exceeded its ${noun} target.` });
  });

  // division producing nothing
  Object.values(cur.byDivision).forEach((d) => {
    if (d.goal > 0 && d.revenue === 0)
      items.push({ sev: "red", text: `${d.name} produced no revenue this ${noun}.` });
  });

  // people behind goal
  Object.values(cur.byPerson).forEach((p) => {
    const pct = safePct(p.revenue, p.goal);
    if (p.goal > 0 && pct !== null && pct < 60)
      items.push({ sev: "yellow", text: `${p.name} is at ${pctText(pct)} of goal — ${$$(Math.max(0, p.goal - p.revenue))} short.` });
  });

  // weak funnel stage per person
  Object.values(cur.byPerson).forEach((p) => {
    const c2c = safePct(p.conversations, p.contacted);
    if (p.contacted >= 15 && c2c !== null && c2c < 25)
      items.push({ sev: "yellow", text: `${p.name} has strong contact activity but only ${pctText(c2c)} convert to conversations.` });
    const o2c = safePct(p.deals, p.offers);
    if (p.offers >= 5 && o2c !== null && o2c < 30)
      items.push({ sev: "yellow", text: `${p.name} is making offers but closing only ${pctText(o2c)} of them.` });
  });

  // weakest team-wide stage
  const stages = [
    ["contact → conversation", cur.contactToConvo],
    ["conversation → offer",   cur.convoToOffer],
    ["offer → close",          cur.offerToClose],
  ].filter(([, v]) => v !== null);
  if (stages.length && cur.contacted > 0) {
    const weakest = stages.reduce((a, b) => (b[1] < a[1] ? b : a));
    if (weakest[1] < 35)
      items.push({ sev: "yellow", text: `Weakest funnel stage team-wide: ${weakest[0]} at ${pctText(weakest[1])}.` });
  }

  // recurring revenue declining
  const recChange = pctChange(cur.recurring, prev.recurring);
  if (recChange !== null && recChange <= -5)
    items.push({ sev: "red", text: `Recurring revenue is down ${Math.abs(recChange).toFixed(0)}% versus the previous ${noun}.` });

  const rank = { red: 0, yellow: 1, green: 2 };
  return items.sort((a, b) => rank[a.sev] - rank[b.sev]).slice(0, 5);
}

/* ═══════════════════════════════════════════════════ SHARED UI BITS ══ */

function Dot({ sev }) {
  return <span className={"sev sev-" + sev}>{sev === "red" ? "🔴" : sev === "yellow" ? "🟡" : "🟢"}</span>;
}

function DeltaTag({ value }) {
  if (value === null) return <span className="delta delta-none">—</span>;
  const cls = value > 0.05 ? "up" : value < -0.05 ? "down" : "flat";
  return <span className={"delta delta-" + cls}>{changeText(value)}</span>;
}

function PeriodBar({ type, setType, offset, setOffset, today }) {
  return (
    <div className="periodbar">
      <div className="seg">
        {["week", "month", "quarter", "year"].map((t) => (
          <button key={t}
            className={"seg-btn" + (type === t ? " seg-on" : "")}
            onClick={() => { setType(t); setOffset(0); }}>
            {PERIOD_NOUN[t]}
          </button>
        ))}
      </div>
      <div className="navline">
        <button className="navbtn" onClick={() => setOffset(offset + 1)} aria-label="Previous period">
          <ChevronLeft size={16} />
        </button>
        <div className="navlabel">
          {periodLabel(type, offset, today)}
          {offset === 0 && <span className="live-dot">Current</span>}
        </div>
        <button className="navbtn" disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 1))} aria-label="Next period">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ EXECUTIVE SCORECARD ══ */

function ExecScorecard({ rep, type }) {
  const c = rep.cur;
  return (
    <div className="exec">
      <div className="exec-hd">
        <span>CEO Executive Scorecard</span>
        <span className="exec-period">{rep.label}</span>
      </div>

      <div className="exec-hero">
        <div className="eh-main">
          <div className="eh-val">{$$(c.revenue)}</div>
          <div className="eh-lbl">Revenue</div>
        </div>
        <div className="eh-side">
          <div className="eh-row"><span>Goal</span><b>{c.goal > 0 ? $$(c.goal) : "—"}</b></div>
          <div className="eh-row"><span>% of Goal</span><b>{pctText(c.pctOfGoal)}</b></div>
          <div className="eh-row"><span>Remaining</span><b>{c.goal > 0 ? $$(c.remaining) : "—"}</b></div>
        </div>
      </div>

      {c.goal > 0 && (
        <div className="exec-bar">
          <div className="exec-bar-fill" style={{ width: barWidth(c.pctOfGoal) + "%" }} />
        </div>
      )}

      <div className="exec-grid">
        <div className="eg"><div className="eg-v">{c.contacted}</div><div className="eg-l">Contacts</div></div>
        <div className="eg"><div className="eg-v">{c.conversations}</div><div className="eg-l">Conversations</div></div>
        <div className="eg"><div className="eg-v">{c.offers}</div><div className="eg-l">Offers</div></div>
        <div className="eg"><div className="eg-v">{c.deals}</div><div className="eg-l">Deals Closed</div></div>
        <div className="eg"><div className="eg-v">{pctText(c.closeRate)}</div><div className="eg-l">Close Rate</div></div>
        <div className="eg"><div className="eg-v">{c.avgTransaction !== null ? $$(c.avgTransaction) : "—"}</div><div className="eg-l">Avg Transaction</div></div>
        <div className="eg"><div className="eg-v">{$$(c.recurring)}</div><div className="eg-l">Recurring</div></div>
        <div className="eg"><div className="eg-v">{$$(c.oneTime)}</div><div className="eg-l">One-Time</div></div>
      </div>

      {c.units > 0 && (
        <div className="exec-foot">
          {c.units} units sold across {c.deals} {c.deals === 1 ? "deal" : "deals"}
          {c.commission > 0 && ` · ${$$(c.commission)} commission`}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════ PERFORMANCE COMPARISON ══ */

function Comparison({ rep, type, offset }) {
  const { cur, prev } = rep;
  const hasPrev = prev.weeks > 0 && (prev.revenue > 0 || prev.contacted > 0 || prev.deals > 0);
  /* A current month/quarter/year still in progress has fewer weeks than the
     completed one before it — say so rather than implying a real decline. */
  const partial = offset === 0 && type !== "week" && prev.weeks > cur.weeks && cur.weeks > 0;

  if (!hasPrev) {
    return (
      <div className="panel">
        <div className="panel-hd">Performance Comparison</div>
        <p className="hint-sm">No historical comparison available yet. Close a week to start building history.</p>
      </div>
    );
  }

  const rows = [
    ["Revenue",         $$(cur.revenue), $$(prev.revenue), pctChange(cur.revenue, prev.revenue)],
    ["Deals Closed",    cur.deals,       prev.deals,       pctChange(cur.deals, prev.deals)],
    ["Contacts",        cur.contacted,   prev.contacted,   pctChange(cur.contacted, prev.contacted)],
    ["Conversations",   cur.conversations, prev.conversations, pctChange(cur.conversations, prev.conversations)],
    ["Offers",          cur.offers,      prev.offers,      pctChange(cur.offers, prev.offers)],
    ["Close Rate",      pctText(cur.closeRate), pctText(prev.closeRate), pctChange(cur.closeRate, prev.closeRate)],
    ["Avg Transaction", cur.avgTransaction !== null ? $$(cur.avgTransaction) : "—",
                        prev.avgTransaction !== null ? $$(prev.avgTransaction) : "—",
                        pctChange(cur.avgTransaction, prev.avgTransaction)],
  ];

  return (
    <div className="panel">
      <div className="panel-hd">Performance Comparison</div>
      <div className="cmp-head">
        <span />
        <span className="cmp-cur">{rep.label}</span>
        <span>{rep.prevLabel}</span>
        <span />
      </div>
      {rows.map(([lbl, a, b, ch]) => (
        <div className="cmp-row" key={lbl}>
          <span className="cmp-lbl">{lbl}</span>
          <span className="cmp-a">{a}</span>
          <span className="cmp-b">{b}</span>
          <DeltaTag value={ch} />
        </div>
      ))}
      {partial && (
        <div className="partial-note">
          In progress: {cur.weeks} {cur.weeks === 1 ? "week" : "weeks"} so far versus {prev.weeks} complete.
          Changes below will look negative until the period fills out.
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════ DIVISION ROLLUP ══ */

function DivisionRollup({ rep }) {
  const c = rep.cur;
  const divs = Object.values(c.byDivision).sort((a, b) => b.revenue - a.revenue);
  if (!divs.length) return null;

  return (
    <div className="panel">
      <div className="panel-hd">Revenue by Division</div>
      {divs.map((d) => {
        const p     = safePct(d.revenue, d.goal);
        const share = safePct(d.revenue, c.revenue);
        return (
          <div className="divrow" key={d.name}>
            <div className="divtop">
              <span className="divname">
                <i className="divdot" style={{ background: DIV_COLOR[d.name] || "#888" }} />
                {d.name}
              </span>
              <span className="divrev">{$$(d.revenue)}</span>
            </div>
            <div className="divbar">
              <div className="divbar-fill"
                style={{ width: barWidth(share) + "%", background: DIV_COLOR[d.name] || "#888" }} />
            </div>
            <div className="divmeta">
              <span>Goal {d.goal > 0 ? $$(d.goal) : "—"}</span>
              <span>{pctText(p)} of goal</span>
              <span>{pctText(share)} of total</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════ GOAL ALLOCATION ══ */

function GoalAllocation({ data }) {
  const company  = n(data.companyGoal);
  const allocated = data.streams.reduce((s, st) => s + n(st.companyGoal), 0);
  if (company <= 0 && allocated <= 0) return null;

  const diff = company - allocated;
  const state = Math.abs(diff) < 1 ? "ok" : diff > 0 ? "under" : "over";

  return (
    <div className={"alloc alloc-" + state}>
      <div className="alloc-row"><span>Company goal (this week)</span><b>{$$(company)}</b></div>
      <div className="alloc-row"><span>Allocated across streams</span><b>{$$(allocated)}</b></div>
      <div className="alloc-row alloc-hi">
        <span>{state === "ok" ? "Fully allocated" : state === "under" ? "Unallocated" : "Overallocated"}</span>
        <b>{state === "ok" ? "✓" : $$(Math.abs(diff))}</b>
      </div>
      {state !== "ok" && (
        <div className="alloc-note">
          {state === "under"
            ? "Stream goals fall short of the company target. Assign the gap so the team knows where it comes from."
            : "Stream goals exceed the company target. Either raise the company goal or trim a stream."}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════ RECURRING SUMMARY ══ */

function RecurringPanel({ rep, type }) {
  const { cur, prev } = rep;
  if (cur.revenue === 0 && cur.recurring === 0) return null;
  const ch = pctChange(cur.recurring, prev.recurring);

  return (
    <div className="panel">
      <div className="panel-hd">Recurring Revenue</div>
      <div className="rec-grid">
        <div className="rec"><div className="rec-v gold">{$$(cur.recurring)}</div><div className="rec-l">This {PERIOD_NOUN[type]}</div></div>
        <div className="rec"><div className="rec-v">{$$(prev.recurring)}</div><div className="rec-l">Previous {PERIOD_NOUN[type]}</div></div>
        <div className="rec"><div className="rec-v"><DeltaTag value={ch} /></div><div className="rec-l">Change</div></div>
        <div className="rec"><div className="rec-v">{pctText(cur.recurringShare)}</div><div className="rec-l">Share of Total</div></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ ATTENTION PANEL ══ */

function AttentionPanel({ items }) {
  if (!items.length) return null;
  return (
    <div className="attn">
      <div className="attn-hd"><AlertCircle size={14} /> CEO Attention Required</div>
      {items.map((it, i) => (
        <div className="attn-row" key={i}>
          <Dot sev={it.sev} /><span>{it.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ CATALOG MODAL ══ */

function CatalogModal({ existing, onSelect, onClose }) {
  const [q, setQ] = useState("");
  const taken = new Set(existing.map((s) => s.name));
  const filtered = CATALOG
    .map((d) => ({ ...d, items: d.items.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase())) }))
    .filter((d) => d.items.length > 0);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <span className="modal-title">Add Revenue Stream</span>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <input className="input modal-search" placeholder="Search the catalog…"
          value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <div className="modal-body">
          {filtered.map((div) => (
            <div key={div.division}>
              <div className="cat-div" style={{ color: DIV_COLOR[div.division] }}>{div.division}</div>
              {div.items.map((item) => (
                <button key={item.name} className="cat-row"
                  onClick={() => { onSelect(item.name, item.prices, div.division, item.type); onClose(); }}>
                  <span className="cat-name">
                    {item.name}
                    {item.type !== "one-time" && <span className="type-tag">{item.type}</span>}
                    {taken.has(item.name) && <span className="added-tag">added</span>}
                  </span>
                  <span className="cat-px">
                    {item.prices.length ? item.prices.map((p) => $$(p)).join(" · ") : "Set price"}
                  </span>
                </button>
              ))}
            </div>
          ))}
          <div>
            <div className="cat-div" style={{ color: "#888" }}>Blank</div>
            <button className="cat-row" onClick={() => { onSelect("", [], "Other / Custom", "one-time"); onClose(); }}>
              <span className="cat-name">Start from scratch</span>
              <span className="cat-px">Custom name &amp; price</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ STREAM CARD ══ */

function StreamCard({ stream: s, people, onUpdate, onRemove }) {
  const [open, setOpen] = useState(false);
  const c   = calcStream(s, people);
  const has = s.catalogPrices.length > 0;
  const set = (patch) => onUpdate({ ...s, ...patch });

  return (
    <div className="card">
      <div className="card-head" onClick={() => setOpen((o) => !o)}>
        <div className="card-head-left">
          <div className="card-name-row">
            <div className="card-name">{s.name || <em className="dim">Unnamed stream</em>}</div>
            <span className="div-chip" style={{ color: DIV_COLOR[s.division] || "#888",
              borderColor: (DIV_COLOR[s.division] || "#888") + "55",
              background: (DIV_COLOR[s.division] || "#888") + "14" }}>
              {(s.division || "Other").split(" ")[0]}
            </span>
            {s.revenueType !== "one-time" && <span className="type-tag">{s.revenueType}</span>}
          </div>
          <div className="card-meta">
            <span>{$$(c.price)}</span><span className="sep">×</span>
            <span>{c.totalQty} units</span><span className="sep">=</span>
            <span className="fw7">{$$(c.revenue)}</span>
            {c.goal > 0 && <span className="tag-pill">{pctText(c.pctOfGoal)} of goal</span>}
          </div>
          {c.goal > 0 && (
            <div className="progbar">
              <div className="progbar-fill" style={{ width: barWidth(c.pctOfGoal) + "%" }} />
            </div>
          )}
          {!open && <div className="tap-hint">Tap to expand &amp; edit ▾</div>}
        </div>
        <div className="chevron">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
      </div>

      {open && (
        <div className="card-body">
          <div className="g2">
            <label className="field">
              <span className="field-lbl">Name</span>
              <input className="input" value={s.name}
                onChange={(e) => set({ name: e.target.value })} placeholder="Stream name" />
            </label>
            <label className="field">
              <span className="field-lbl">Division</span>
              <select className="input" value={s.division || "Other / Custom"}
                onChange={(e) => set({ division: e.target.value })}>
                {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <div className="field">
              <span className="field-lbl">Price per unit</span>
              <div className="price-wrap">
                {has && (
                  <select className="input"
                    value={s.priceMode === "custom" ? "__c" : s.selectedPrice}
                    onChange={(e) => {
                      if (e.target.value === "__c") set({ priceMode: "custom" });
                      else set({ priceMode: "preset", selectedPrice: e.target.value });
                    }}>
                    {s.catalogPrices.map((p) => <option key={p} value={p}>{$$(p)}</option>)}
                    <option value="__c">Custom…</option>
                  </select>
                )}
                {(s.priceMode === "custom" || !has) && (
                  <input className="input" type="number" inputMode="decimal"
                    placeholder="Enter price" value={s.customPrice}
                    onChange={(e) => set({ customPrice: e.target.value, priceMode: "custom" })} />
                )}
              </div>
            </div>
            <label className="field">
              <span className="field-lbl">Revenue type</span>
              <select className="input" value={s.revenueType || "one-time"}
                onChange={(e) => set({ revenueType: e.target.value })}>
                {REVENUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-lbl">Weekly revenue goal ($)</span>
              <input className="input" type="number" inputMode="decimal" placeholder="e.g. 2500"
                value={s.companyGoal} onChange={(e) => set({ companyGoal: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-lbl">House units (not from a rep)</span>
              <input className="input" type="number" inputMode="decimal" placeholder="0"
                value={s.houseQty} onChange={(e) => set({ houseQty: e.target.value })} />
            </label>
          </div>

          {people.length > 0 && c.teamQty > 0 && (
            <>
              <div className="sect-lbl">Sold by</div>
              <div className="rep-list">
                {people.filter((p) => lineQty(p, s.id) > 0).map((p) => {
                  const q = lineQty(p, s.id);
                  return (
                    <div key={p.id} className="rep-row">
                      <span className="rep-nm">{p.name || "(unnamed)"}</span>
                      <span className="rep-q">{q} units</span>
                      <span className="rep-rv">{$$(q * c.price)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {c.goal > 0 && (
            <div className="cg">
              <div className="ci">
                <div className="ci-lbl">Sales required</div>
                <div className="ci-val">{c.salesReq ?? "—"}</div>
              </div>
              <div className="ci">
                <div className="ci-lbl">Sales still needed</div>
                <div className="ci-val" style={{ color: c.salesLeft > 0 ? "#8A2E2E" : "#2F6B4F" }}>
                  {c.salesLeft ?? "—"}
                </div>
              </div>
              <div className="ci">
                <div className="ci-lbl">Remaining to goal</div>
                <div className="ci-val">{$$(c.remaining)}</div>
              </div>
              <div className="ci">
                <div className="ci-lbl">% of goal</div>
                <div className="ci-val">{pctText(c.pctOfGoal)}</div>
              </div>
            </div>
          )}

          <button className="remove-btn" onClick={onRemove}>
            <Trash2 size={14} /> Remove stream
          </button>
        </div>
      )}
    </div>
  );
}

/* Read-only stream performance for a historical / aggregate period */
function StreamPerformance({ rep }) {
  const rows = Object.values(rep.cur.byStream).sort((a, b) => b.revenue - a.revenue);
  if (!rows.length) return null;
  return (
    <div className="panel">
      <div className="panel-hd">Revenue by Stream</div>
      {rows.map((r) => {
        const p = safePct(r.revenue, r.goal);
        return (
          <div className="sp-row" key={r.name}>
            <div className="sp-top">
              <span className="sp-nm">{r.name}</span>
              <span className="sp-rv">{$$(r.revenue)}</span>
            </div>
            <div className="sp-meta">
              <span>{r.units} units</span>
              <span>Goal {r.goal > 0 ? $$(r.goal) : "—"}</span>
              <span>{pctText(p)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PersonPerformance({ rep }) {
  const rows = Object.values(rep.cur.byPerson).sort((a, b) => b.revenue - a.revenue);
  if (!rows.length) return null;
  return (
    <div className="panel">
      <div className="panel-hd">Revenue by Team Member</div>
      {rows.map((r) => {
        const p = safePct(r.revenue, r.goal);
        const cr = safePct(r.deals, r.contacted);
        return (
          <div className="sp-row" key={r.name}>
            <div className="sp-top">
              <span className="sp-nm">{r.name}{r.role ? ` · ${r.role}` : ""}</span>
              <span className="sp-rv">{$$(r.revenue)}</span>
            </div>
            <div className="sp-meta">
              <span>{r.contacted} contacts</span>
              <span>{r.deals} deals</span>
              <span>close {pctText(cr)}</span>
              <span>{pctText(p)} of goal</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ REVENUE TAB ══ */

function RevenueTab({ data, setData, type, offset, setType, setOffset, today, onCloseWeek }) {
  const [showCat, setShowCat] = useState(false);
  const rep = periodReport(data, type, offset, today);
  const attn = attentionItems(data, rep, type);
  const isLiveWeek = type === "week" && offset === 0;

  const add = (name, prices, division, rtype) =>
    setData((d) => ({ ...d, streams: [...d.streams, blankStream(name, prices, division, rtype)] }));
  const addStarter = () =>
    setData((d) => {
      const have = new Set(d.streams.map((s) => s.name));
      const fresh = STARTER.filter(([nm]) => !have.has(nm))
        .map(([nm, dv, px, rt]) => blankStream(nm, px, dv, rt));
      return { ...d, streams: [...d.streams, ...fresh] };
    });
  const upd = (id, s) =>
    setData((d) => ({ ...d, streams: d.streams.map((x) => (x.id === id ? s : x)) }));
  const rem = (id) =>
    setData((d) => ({
      ...d,
      streams: d.streams.filter((x) => x.id !== id),
      people: d.people.map((p) => {
        const lines = { ...p.lines }; delete lines[id]; return { ...p, lines };
      }),
    }));

  return (
    <div className="tab-body">
      <PeriodBar type={type} setType={setType} offset={offset} setOffset={setOffset} today={today} />

      <ExecScorecard rep={rep} type={type} />
      <AttentionPanel items={attn} />
      <Comparison rep={rep} type={type} offset={offset} />
      <DivisionRollup rep={rep} />
      <RecurringPanel rep={rep} type={type} />

      {!isLiveWeek && (
        <>
          <StreamPerformance rep={rep} />
          <PersonPerformance rep={rep} />
          <div className="readonly-note">
            Viewing {rep.label}. Switch to the current week to enter or edit numbers.
          </div>
        </>
      )}

      {isLiveWeek && (
        <>
          <div className="company-block">
            <div className="g2">
              <label className="field">
                <span className="field-lbl">Company name</span>
                <input className="input" value={data.companyName}
                  onChange={(e) => setData((d) => ({ ...d, companyName: e.target.value }))} />
              </label>
              <label className="field">
                <span className="field-lbl">Weekly revenue goal ($)</span>
                <input className="input" type="number" inputMode="decimal" placeholder="e.g. 7500"
                  value={data.companyGoal}
                  onChange={(e) => setData((d) => ({ ...d, companyGoal: e.target.value }))} />
              </label>
            </div>
            <GoalAllocation data={data} />
          </div>

          <div className="row-between">
            <h2>Revenue Streams</h2>
            <button className="btn-primary" onClick={() => setShowCat(true)}>
              <Plus size={15} /> Add Stream
            </button>
          </div>
          <p className="hint-sm">
            Set price, division, type, and goal here. Units sold are entered per person in the Team tab and roll up automatically.
          </p>

          {data.streams.length === 0 ? (
            <div className="empty-state">
              <div className="e-icon">💰</div>
              <p className="e-h">No streams yet</p>
              <p className="e-sub">Load your six current streams in one tap, or pick from the full catalog.</p>
              <button className="btn-primary" onClick={addStarter}><Zap size={15} /> Load My Streams</button>
              <button className="btn-secondary" onClick={() => setShowCat(true)}><Plus size={14} /> Browse catalog</button>
            </div>
          ) : (
            <>
              {data.streams.map((s) => (
                <StreamCard key={s.id} stream={s} people={data.people}
                  onUpdate={(u) => upd(s.id, u)} onRemove={() => rem(s.id)} />
              ))}
              <div className="total-bar">
                <span>{data.streams.length} stream{data.streams.length !== 1 ? "s" : ""}</span>
                <strong className="gold">{$$(rep.cur.revenue)}</strong>
              </div>
              <button className="btn-secondary" onClick={() => setShowCat(true)}>
                <Plus size={14} /> Add another stream
              </button>

              <button className="btn-close-week" onClick={onCloseWeek}>
                <Archive size={15} /> Close Week &amp; Save to History
              </button>
              <p className="hint-sm center">
                Saves this week permanently, then starts a fresh week. History is never deleted.
              </p>
            </>
          )}
        </>
      )}

      {showCat && (
        <CatalogModal existing={data.streams} onSelect={add} onClose={() => setShowCat(false)} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ PERSON CARD ══ */

function PersonCard({ person: p, streams, onUpdate, onRemove }) {
  const [open, setOpen] = useState(false);
  const m   = calcPerson(p, streams);
  const set = (patch) => onUpdate({ ...p, ...patch });
  const setQty = (sid, qty) => set({ lines: { ...p.lines, [sid]: { qty } } });

  return (
    <div className="card">
      <div className="card-head" onClick={() => setOpen((o) => !o)}>
        <div className="card-head-left">
          <div className="card-name-row">
            <div className="card-name">{p.name || <em className="dim">Unnamed</em>}</div>
            {p.role && <span className="role-tag">{p.role}</span>}
          </div>

          <div className="score-line">
            <span className="sl"><b>{m.contacted}</b> Contacts</span>
            <span className="sl"><b>{m.conversations}</b> Convos</span>
            <span className="sl"><b>{m.offers}</b> Offers</span>
            <span className="sl"><b>{m.deals}</b> Deals</span>
            <span className="sl"><b>{m.units}</b> Units</span>
            <span className="sl sl-rev"><b>{$$(m.revenue)}</b></span>
            {m.goal > 0 && (
              <span className={"sl-pct " + (m.pctOfGoal >= 100 ? "ok" : m.pctOfGoal >= 70 ? "mid" : "low")}>
                {pctText(m.pctOfGoal)} of goal
              </span>
            )}
          </div>

          {m.goal > 0 && (
            <div className="progbar">
              <div className="progbar-fill" style={{ width: barWidth(m.pctOfGoal) + "%" }} />
            </div>
          )}
          {!open && <div className="tap-hint">Tap to expand &amp; edit ▾</div>}
        </div>
        <div className="chevron">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
      </div>

      {open && (
        <div className="card-body">
          <div className="g2">
            <label className="field">
              <span className="field-lbl">Team member name</span>
              <input className="input" value={p.name}
                onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Ericka" />
            </label>
            <label className="field">
              <span className="field-lbl">Role</span>
              <input className="input" value={p.role}
                onChange={(e) => set({ role: e.target.value })} placeholder="e.g. Talent Sales" />
            </label>
          </div>

          <div className="sect-lbl">Funnel · Activity → Conversation → Offer → Deal</div>
          <div className="funnel-grid">
            <label className="fn-cell">
              <span className="fn-lbl">People Contacted</span>
              <input className="input" type="number" inputMode="decimal" placeholder="0"
                value={p.contacted} onChange={(e) => set({ contacted: e.target.value })} />
            </label>
            <label className="fn-cell">
              <span className="fn-lbl">Conversations</span>
              <input className="input" type="number" inputMode="decimal" placeholder="0"
                value={p.conversations} onChange={(e) => set({ conversations: e.target.value })} />
            </label>
            <label className="fn-cell">
              <span className="fn-lbl">Offers Made</span>
              <input className="input" type="number" inputMode="decimal" placeholder="0"
                value={p.offers} onChange={(e) => set({ offers: e.target.value })} />
            </label>
            <label className="fn-cell">
              <span className="fn-lbl">Clients / Deals Closed</span>
              <input className="input" type="number" inputMode="decimal" placeholder="0"
                value={p.dealsClosed} onChange={(e) => set({ dealsClosed: e.target.value })} />
            </label>
          </div>
          <p className="hint-xs">
            One client buying three products = 1 deal, 3 units. Enter units below.
          </p>

          <div className="rate-strip">
            <div className="rt"><span>Contact → Convo</span><b>{pctText(m.contactToConvo)}</b></div>
            <div className="rt"><span>Convo → Offer</span><b>{pctText(m.convoToOffer)}</b></div>
            <div className="rt"><span>Offer → Close</span><b>{pctText(m.offerToClose)}</b></div>
            <div className="rt"><span>Overall Close</span><b>{pctText(m.overallClose)}</b></div>
          </div>

          <div className="sect-lbl">Units Sold by Stream</div>
          {streams.length === 0 ? (
            <p className="hint-sm">Add revenue streams first — they'll appear here for each person.</p>
          ) : (
            <div className="matrix">
              {streams.map((st) => {
                const q  = lineQty(p, st.id);
                const px = effPrice(st);
                return (
                  <div key={st.id} className="mx-row">
                    <div className="mx-name">
                      {st.name || "Unnamed"}
                      <span className="mx-px">{$$(px)} each</span>
                    </div>
                    <input className="input mx-in" type="number" inputMode="decimal" placeholder="0"
                      value={(p.lines?.[st.id]?.qty) ?? ""}
                      onChange={(e) => setQty(st.id, e.target.value)} />
                    <div className="mx-rev">{$$(q * px)}</div>
                  </div>
                );
              })}
              <div className="mx-row mx-total">
                <div className="mx-name">Revenue generated</div>
                <div className="mx-in-static">{m.units}</div>
                <div className="mx-rev">{$$(m.revenue)}</div>
              </div>
            </div>
          )}

          <div className="sect-lbl">Goal</div>
          <div className="g2">
            <label className="field">
              <span className="field-lbl">Weekly revenue goal ($)</span>
              <input className="input" type="number" inputMode="decimal" placeholder="e.g. 3500"
                value={p.weeklyGoal} onChange={(e) => set({ weeklyGoal: e.target.value })} />
            </label>
            <div className="field">
              <span className="field-lbl">Avg transaction (rev ÷ deals)</span>
              <div className="calc-disp">{m.avgTransaction !== null ? $$(m.avgTransaction) : "—"}</div>
            </div>
          </div>

          {m.goal > 0 && (
            <div className="cg">
              <div className="ci ci-hero">
                <div className="ci-lbl">% of goal</div>
                <div className="ci-val gold">{pctText(m.pctOfGoal)}</div>
              </div>
              <div className="ci">
                <div className="ci-lbl">Remaining to goal</div>
                <div className="ci-val">{$$(m.remaining)}</div>
              </div>
            </div>
          )}

          <button className="remove-btn" onClick={onRemove}>
            <Trash2 size={14} /> Remove team member
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ TEAM TAB ══ */

function TeamTab({ data, setData, today }) {
  const live = aggregate([activeSnapshot(data)]);
  const add = () => setData((d) => ({ ...d, people: [...d.people, blankPerson()] }));
  const upd = (id, p) =>
    setData((d) => ({ ...d, people: d.people.map((x) => (x.id === id ? p : x)) }));
  const rem = (id) =>
    setData((d) => ({ ...d, people: d.people.filter((x) => x.id !== id) }));

  const ws = parseD(data.activeWeekStart || isoD(startOfWeek(today)));

  return (
    <div className="tab-body">
      <div className="pulse">
        <div className="pulse-hd">
          <span>CEO Sales Pulse</span>
          <span className="pulse-week">
            Week {isoWeekNum(ws)} · {MONTHS_S[ws.getMonth()]} {ws.getDate()}–{MONTHS_S[addDays(ws,6).getMonth()]} {addDays(ws,6).getDate()}
          </span>
        </div>
        <div className="pulse-grid">
          <div className="pl"><div className="pl-v">{live.contacted}</div><div className="pl-l">Contacts</div></div>
          <div className="pl"><div className="pl-v">{live.conversations}</div><div className="pl-l">Conversations</div></div>
          <div className="pl"><div className="pl-v">{live.deals}</div><div className="pl-l">Deals</div></div>
          <div className="pl"><div className="pl-v gold">{$$(live.revenue)}</div><div className="pl-l">Revenue</div></div>
        </div>
      </div>

      <div className="row-between">
        <h2>Scorecard</h2>
        <button className="btn-primary" onClick={add}><Plus size={15} /> Add Member</button>
      </div>

      {data.people.length === 0 ? (
        <div className="empty-state">
          <div className="e-icon">👥</div>
          <p className="e-h">No team members yet</p>
          <p className="e-sub">Add yourself first, then each rep. Everything entered here feeds the Revenue dashboard automatically.</p>
          <button className="btn-primary" onClick={add}><Plus size={15} /> Add Team Member</button>
        </div>
      ) : (
        data.people.map((p) => (
          <PersonCard key={p.id} person={p} streams={data.streams}
            onUpdate={(u) => upd(p.id, u)} onRemove={() => rem(p.id)} />
        ))
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ CHARTS TAB ══ */

function ChartCard({ title, subtitle, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="chart-card">
      <div className="chart-head" onClick={() => setOpen((o) => !o)}>
        <div>
          <div className="chart-title">{title}</div>
          {subtitle && <div className="chart-sub">{subtitle}</div>}
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {open && <div className="chart-body">{children}</div>}
    </div>
  );
}

function ChartsTab({ data, type, offset, setType, setOffset, today }) {
  const records = allWeekRecords(data);
  const rep = periodReport(data, type, offset, today);
  const fmtK = (v) => "$" + (Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + "k" : v);

  /* Weekly trend — last 12 weeks that exist */
  const weeklyTrend = records.slice(-12).map((w) => ({
    name: `W${w.weekNumber}`,
    Revenue: Math.round((w.streams || []).reduce((s, st) => s + n(st.revenue), 0)),
    Goal: Math.round(n(w.companyGoal)),
  }));

  /* Monthly trend — group every week by year-month */
  const monthMap = {};
  records.forEach((w) => {
    const k = `${w.year}-${pad2(w.month)}`;
    if (!monthMap[k]) monthMap[k] = { name: `${MONTHS_S[w.month - 1]} ${String(w.year).slice(2)}`, Revenue: 0, Goal: 0, sort: k };
    monthMap[k].Revenue += (w.streams || []).reduce((s, st) => s + n(st.revenue), 0);
    monthMap[k].Goal    += n(w.companyGoal);
  });
  const monthlyTrend = Object.values(monthMap).sort((a, b) => (a.sort < b.sort ? -1 : 1))
    .map((m) => ({ ...m, Revenue: Math.round(m.Revenue), Goal: Math.round(m.Goal) }));

  /* Quarterly trend */
  const qMap = {};
  records.forEach((w) => {
    const k = `${w.year}-Q${w.quarter}`;
    if (!qMap[k]) qMap[k] = { name: `Q${w.quarter} '${String(w.year).slice(2)}`, Revenue: 0, Goal: 0, sort: k };
    qMap[k].Revenue += (w.streams || []).reduce((s, st) => s + n(st.revenue), 0);
    qMap[k].Goal    += n(w.companyGoal);
  });
  const quarterlyTrend = Object.values(qMap).sort((a, b) => (a.sort < b.sort ? -1 : 1))
    .map((m) => ({ ...m, Revenue: Math.round(m.Revenue), Goal: Math.round(m.Goal) }));

  /* Annual view — Jan through Dec of the selected year */
  const selYear = periodRange(type, offset, today).start.getFullYear();
  const annual = MONTHS_S.map((mn, i) => {
    const ws = records.filter((w) => w.year === selYear && w.month === i + 1);
    return {
      name: mn,
      Revenue: Math.round(ws.reduce((s, w) => s + (w.streams || []).reduce((x, st) => x + n(st.revenue), 0), 0)),
      Goal: Math.round(ws.reduce((s, w) => s + n(w.companyGoal), 0)),
    };
  });

  const divBars = Object.values(rep.cur.byDivision)
    .map((d) => ({ name: d.name.split(" ")[0], Revenue: Math.round(d.revenue), Goal: Math.round(d.goal) }))
    .filter((d) => d.Revenue > 0 || d.Goal > 0);

  const personBars = Object.values(rep.cur.byPerson)
    .map((p) => ({ name: p.name, Revenue: Math.round(p.revenue), Goal: Math.round(p.goal) }))
    .filter((d) => d.Revenue > 0 || d.Goal > 0);

  const hasHistory = records.length > 1;

  return (
    <div className="tab-body">
      <PeriodBar type={type} setType={setType} offset={offset} setOffset={setOffset} today={today} />

      <ChartCard title="Goal vs Actual" subtitle={rep.label} defaultOpen>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={[{ name: rep.label, Actual: Math.round(rep.cur.revenue), Goal: Math.round(rep.cur.goal) }]}>
            <CartesianGrid stroke="#E5DAC8" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
            <Tooltip formatter={(v) => $$(v)} />
            <Legend />
            <Bar dataKey="Goal" fill="#C4B08F" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Actual" fill="#B8860B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Weekly Revenue Trend" subtitle={hasHistory ? "Last 12 weeks" : "Close a week to build history"} defaultOpen={hasHistory}>
        {weeklyTrend.length < 2 ? (
          <p className="hint-sm">Not enough history yet. Close a week to start the trend line.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyTrend}>
              <CartesianGrid stroke="#E5DAC8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtK} />
              <Tooltip formatter={(v) => $$(v)} />
              <Legend />
              <Line type="monotone" dataKey="Goal" stroke="#C4B08F" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="Revenue" stroke="#B8860B" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Monthly Revenue Trend">
        {monthlyTrend.length < 1 ? (
          <p className="hint-sm">No monthly data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid stroke="#E5DAC8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtK} />
              <Tooltip formatter={(v) => $$(v)} />
              <Legend />
              <Bar dataKey="Goal" fill="#C4B08F" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Revenue" fill="#B8860B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Quarterly Revenue Trend">
        {quarterlyTrend.length < 1 ? (
          <p className="hint-sm">No quarterly data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={quarterlyTrend}>
              <CartesianGrid stroke="#E5DAC8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtK} />
              <Tooltip formatter={(v) => $$(v)} />
              <Legend />
              <Bar dataKey="Goal" fill="#C4B08F" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Revenue" fill="#B8860B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title={`${selYear} Revenue by Month`}>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={annual}>
            <CartesianGrid stroke="#E5DAC8" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9.5 }} interval={0} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtK} />
            <Tooltip formatter={(v) => $$(v)} />
            <Bar dataKey="Revenue" fill="#B8860B" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {divBars.length > 0 && (
        <ChartCard title="Revenue by Division" subtitle={rep.label}>
          <ResponsiveContainer width="100%" height={Math.max(160, divBars.length * 48)}>
            <BarChart data={divBars} layout="vertical">
              <CartesianGrid stroke="#E5DAC8" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtK} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10.5 }} width={90} />
              <Tooltip formatter={(v) => $$(v)} />
              <Legend />
              <Bar dataKey="Goal" fill="#C4B08F" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Revenue" fill="#B8860B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {personBars.length > 0 && (
        <ChartCard title="Revenue by Team Member" subtitle={rep.label}>
          <ResponsiveContainer width="100%" height={Math.max(160, personBars.length * 48)}>
            <BarChart data={personBars} layout="vertical">
              <CartesianGrid stroke="#E5DAC8" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtK} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10.5 }} width={90} />
              <Tooltip formatter={(v) => $$(v)} />
              <Legend />
              <Bar dataKey="Goal" fill="#C4B08F" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Revenue" fill="#B8860B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ SETTINGS TAB ══ */

function SettingsTab({ data, setData, onReset, today }) {
  const exportCSV = () => {
    const q = (v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`;
    const rows = [];

    rows.push(["=== CURRENT WEEK — REVENUE STREAMS ==="]);
    rows.push(["Stream","Division","Revenue Type","Price","Units","Revenue","Goal","% of Goal","Sales Required","Sales Still Needed"]);
    data.streams.forEach((s) => {
      const c = calcStream(s, data.people);
      rows.push([s.name, s.division, s.revenueType, c.price, c.totalQty, c.revenue.toFixed(2), c.goal,
        c.pctOfGoal === null ? "" : c.pctOfGoal.toFixed(1), c.salesReq ?? "", c.salesLeft ?? ""]);
    });

    rows.push([]);
    rows.push(["=== CURRENT WEEK — TEAM SCORECARD ==="]);
    rows.push(["Name","Role","Contacted","Conversations","Offers","Deals Closed","Units","Revenue",
               "Weekly Goal","% of Goal","Remaining","Contact-Convo","Convo-Offer","Offer-Close","Overall Close","Avg Transaction"]);
    data.people.forEach((p) => {
      const m = calcPerson(p, data.streams);
      const f = (v) => (v === null ? "" : v.toFixed(1));
      rows.push([p.name, p.role, m.contacted, m.conversations, m.offers, m.deals,
        m.units, m.revenue.toFixed(2), m.goal, f(m.pctOfGoal), m.remaining.toFixed(2),
        f(m.contactToConvo), f(m.convoToOffer), f(m.offerToClose), f(m.overallClose),
        m.avgTransaction === null ? "" : m.avgTransaction.toFixed(2)]);
    });

    rows.push([]);
    rows.push(["=== CURRENT WEEK — UNITS BY PERSON x STREAM ==="]);
    rows.push(["Person","Stream","Units","Revenue"]);
    data.people.forEach((p) => data.streams.forEach((st) => {
      const qv = lineQty(p, st.id);
      if (qv) rows.push([p.name, st.name, qv, (qv * effPrice(st)).toFixed(2)]);
    }));

    /* history */
    rows.push([]);
    rows.push(["=== WEEKLY HISTORY — SUMMARY ==="]);
    rows.push(["Week Start","Week End","Week #","Month","Quarter","Year","Revenue","Goal","% of Goal",
               "Units","Deals","Contacts","Conversations","Offers","Close Rate","Avg Transaction","Recurring","One-Time","Commission"]);
    (data.history?.weeks || []).forEach((w) => {
      const a = aggregate([w]);
      rows.push([w.weekStart, w.weekEnd, w.weekNumber, w.month, w.quarter, w.year,
        a.revenue.toFixed(2), a.goal, a.pctOfGoal === null ? "" : a.pctOfGoal.toFixed(1),
        a.units, a.deals, a.contacted, a.conversations, a.offers,
        a.closeRate === null ? "" : a.closeRate.toFixed(1),
        a.avgTransaction === null ? "" : a.avgTransaction.toFixed(2),
        a.recurring.toFixed(2), a.oneTime.toFixed(2), a.commission.toFixed(2)]);
    });

    rows.push([]);
    rows.push(["=== WEEKLY HISTORY — BY STREAM ==="]);
    rows.push(["Week Start","Stream","Division","Revenue Type","Price","Units","Revenue","Goal"]);
    (data.history?.weeks || []).forEach((w) =>
      (w.streams || []).forEach((st) =>
        rows.push([w.weekStart, st.name, st.division, st.revenueType, st.price, st.units, n(st.revenue).toFixed(2), st.goal])));

    rows.push([]);
    rows.push(["=== WEEKLY HISTORY — BY PERSON ==="]);
    rows.push(["Week Start","Name","Role","Contacts","Conversations","Offers","Deals","Units","Revenue","Goal"]);
    (data.history?.weeks || []).forEach((w) =>
      (w.people || []).forEach((p) =>
        rows.push([w.weekStart, p.name, p.role, p.contacted, p.conversations, p.offers,
          p.deals, p.units, n(p.revenue).toFixed(2), p.goal])));

    const csv = rows.map((r) => r.map(q).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: `mlm-dashboard-${isoD(today)}.csv`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const setStream = (id, patch) =>
    setData((d) => ({ ...d, streams: d.streams.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const deleteWeek = (wid) => {
    const w = (data.history?.weeks || []).find((x) => x.id === wid);
    if (!w) return;
    if (!window.confirm(`Delete the snapshot for ${w.weekStart} → ${w.weekEnd}? This cannot be undone.`)) return;
    setData((d) => ({ ...d, history: { weeks: d.history.weeks.filter((x) => x.id !== wid) } }));
  };

  const weeks = [...(data.history?.weeks || [])].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));

  return (
    <div className="tab-body">
      <h2>Settings</h2>

      <div className="sect-lbl">Streams · Price, Division, Type &amp; Goal</div>
      {data.streams.length === 0 ? (
        <p className="hint-sm">No streams yet — add them on the Revenue tab.</p>
      ) : (
        <div className="setlist">
          {data.streams.map((s) => (
            <div className="setrow" key={s.id}>
              <div className="setname">{s.name || "Unnamed"}</div>
              <div className="setgrid">
                <label className="sf">
                  <span>Price</span>
                  <input className="input" type="number" inputMode="decimal"
                    value={s.priceMode === "custom" ? s.customPrice : s.selectedPrice}
                    onChange={(e) => setStream(s.id, { priceMode: "custom", customPrice: e.target.value })} />
                </label>
                <label className="sf">
                  <span>Weekly goal</span>
                  <input className="input" type="number" inputMode="decimal"
                    value={s.companyGoal}
                    onChange={(e) => setStream(s.id, { companyGoal: e.target.value })} />
                </label>
                <label className="sf">
                  <span>Division</span>
                  <select className="input" value={s.division || "Other / Custom"}
                    onChange={(e) => setStream(s.id, { division: e.target.value })}>
                    {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </label>
                <label className="sf">
                  <span>Type</span>
                  <select className="input" value={s.revenueType || "one-time"}
                    onChange={(e) => setStream(s.id, { revenueType: e.target.value })}>
                    {REVENUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sect-lbl">Active Week</div>
      <label className="field">
        <span className="field-lbl">Week starting (Monday)</span>
        <input className="input" type="date"
          value={data.activeWeekStart || ""}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            setData((d) => ({ ...d, activeWeekStart: isoD(startOfWeek(parseD(v))) }));
          }} />
      </label>
      <p className="hint-xs">Adjust only if the current week's numbers belong to a different week.</p>

      <div className="sect-lbl">Weekly History · {weeks.length} saved</div>
      {weeks.length === 0 ? (
        <p className="hint-sm">No closed weeks yet. Use “Close Week” on the Revenue tab to start building history.</p>
      ) : (
        <div className="histlist">
          {weeks.map((w) => {
            const a = aggregate([w]);
            return (
              <div className="histrow" key={w.id}>
                <div className="histmain">
                  <div className="histwk">Week {w.weekNumber} · {w.year}</div>
                  <div className="histdates">{w.weekStart} → {w.weekEnd} · Q{w.quarter}</div>
                </div>
                <div className="histrev">{$$(a.revenue)}</div>
                <button className="histdel" onClick={() => deleteWeek(w.id)} aria-label="Delete snapshot">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="sect-lbl">Export</div>
      <div className="settings-row">
        <button className="btn-action" onClick={exportCSV}><Download size={15} /> Export CSV</button>
        <button className="btn-action" onClick={() => window.print()}><Printer size={15} /> Print / PDF</button>
        <button className="btn-action btn-danger" onClick={onReset}><RotateCcw size={15} /> Reset all data</button>
      </div>

      <div className="storage-note">
        <strong>How it connects:</strong> Revenue holds prices, divisions, types and goals. Team holds the funnel and units sold. Closing a week saves a permanent snapshot, and month, quarter, and year reports are built by summing real weeks — never by multiplying one week.
      </div>
      <div className="storage-note">
        <strong>Deals vs Units:</strong> One client buying three products is 1 deal and 3 units. Average transaction value is revenue ÷ deals.
      </div>
      <div className="storage-note">
        <strong>Storage:</strong> Saves automatically in this browser and persists across sessions on this device.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ MIGRATION ══ */

/* Look up a catalog entry by name to backfill division / revenue type */
function catalogLookup(name) {
  for (const div of CATALOG) {
    const hit = div.items.find((i) => i.name === name);
    if (hit) return { division: div.division, type: hit.type };
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

/* Safe, additive migration. Never wipes, never breaks an old save. */
function migrate(saved) {
  const d = { ...defaultData(), ...(saved || {}) };

  /* v5 and earlier: separate expo events → fold into an Expo Revenue stream */
  if (Array.isArray(saved?.expos) && saved.expos.length) {
    const gross = saved.expos.reduce(
      (s, e) => s + (e.packages || []).reduce((x, p) => x + n(p.price) * n(p.qtySold), 0), 0);
    if (gross > 0) {
      const st = blankStream("Expo Revenue", [], "Expos & Conventions", "one-time");
      st.priceMode = "custom"; st.customPrice = "1"; st.houseQty = String(gross);
      d.streams = [...(d.streams || []), st];
    }
  }
  delete d.expos;

  /* streams: backfill division + revenueType, preserve everything else */
  d.streams = (d.streams || []).map((s) => {
    const look = s.name ? catalogLookup(s.name) : null;
    return {
      ...blankStream(),
      ...s,
      catalogPrices: Array.isArray(s.catalogPrices) ? s.catalogPrices : [],
      division:    s.division    || look?.division || "Other / Custom",
      revenueType: s.revenueType || look?.type     || guessType(s.name),
    };
  });

  /* people: rename salesClosed → dealsClosed, normalize lines */
  d.people = (d.people || []).map((p) => {
    const base = { ...blankPerson(), ...p };
    base.dealsClosed = p.dealsClosed ?? p.salesClosed ?? "";
    delete base.salesClosed;
    base.lines = Object.fromEntries(
      Object.entries(p.lines || {}).map(([k, v]) => [k, { qty: v?.qty ?? "" }])
    );
    return base;
  });

  /* history: ensure shape, backfill snapshot fields from older saves */
  const weeks = Array.isArray(saved?.history?.weeks) ? saved.history.weeks : [];
  d.history = {
    weeks: weeks.map((w) => {
      const start = parseD(w.weekStart || isoD(startOfWeek(new Date())));
      return {
        ...w,
        id: w.id || uid(),
        weekEnd:    w.weekEnd    || isoD(addDays(start, 6)),
        weekNumber: w.weekNumber ?? isoWeekNum(start),
        month:      w.month      ?? start.getMonth() + 1,
        quarter:    w.quarter    ?? quarterOf(start.getMonth()),
        year:       w.year       ?? start.getFullYear(),
        streams: (w.streams || []).map((st) => ({
          ...st,
          division:    st.division    || catalogLookup(st.name)?.division || "Other / Custom",
          revenueType: st.revenueType || catalogLookup(st.name)?.type     || guessType(st.name),
        })),
        people: (w.people || []).map((p) => ({ ...p, deals: p.deals ?? p.sales ?? 0 })),
      };
    }),
  };

  if (!d.activeWeekStart) d.activeWeekStart = isoD(startOfWeek(new Date()));
  else d.activeWeekStart = isoD(startOfWeek(parseD(d.activeWeekStart)));

  return d;
}

/* ═══════════════════════════════════════════════════ ROOT APP ══ */

export default function App() {
  const [data, setData]     = useState(null);
  const [tab, setTab]       = useState("rev");
  const [save, setSave]     = useState("saved");
  const [type, setType]     = useState("week");
  const [offset, setOffset] = useState(0);
  const timer = useRef(null);
  const ready = useRef(false);
  const today = new Date();

  useEffect(() => {
    load().then((s) => {
      setData(migrate(s));
      setTimeout(() => { ready.current = true; }, 50);
    });
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
    const rev  = snap.streams.reduce((s, st) => s + n(st.revenue), 0);

    const dupe = (data.history?.weeks || []).some((w) => w.weekStart === ws);
    const msg =
      `Close the week of ${snap.weekStart} → ${snap.weekEnd}?\n\n` +
      `Revenue: ${$$(rev)}\n` +
      `Deals: ${snap.people.reduce((s, p) => s + n(p.deals), 0)}\n` +
      `Units: ${snap.streams.reduce((s, st) => s + n(st.units), 0)}\n\n` +
      (dupe ? "⚠️ A snapshot for this week already exists — a second one will be added.\n\n" : "") +
      `This saves a permanent snapshot, then clears the funnel and unit counts to start a fresh week. ` +
      `Prices, goals, streams, and team members are kept. History is never deleted.`;

    if (!window.confirm(msg)) return;

    /* next active week = the Monday after the week just closed, or this
       week's Monday if that's already later */
    const closedStart = parseD(ws);
    const nextStart   = new Date(Math.max(addDays(closedStart, 7).getTime(), startOfWeek(today).getTime()));

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
        {[["rev","Revenue"],["team","Team"],["charts","Charts"],["settings","Settings"]].map(([id, lb]) => (
          <button key={id} className={"nav-btn" + (tab === id ? " nav-active" : "")}
            onClick={() => setTab(id)}>{lb}</button>
        ))}
      </nav>

      <main className="main">
        {tab === "rev" && (
          <RevenueTab data={data} setData={setData} today={today}
            type={type} offset={offset} setType={setType} setOffset={setOffset}
            onCloseWeek={closeWeek} />
        )}
        {tab === "team"   && <TeamTab data={data} setData={setData} today={today} />}
        {tab === "charts" && (
          <ChartsTab data={data} today={today}
            type={type} offset={offset} setType={setType} setOffset={setOffset} />
        )}
        {tab === "settings" && (
          <SettingsTab data={data} setData={setData} today={today}
            onReset={() => {
              if (window.confirm("Clear ALL data including saved week history? This cannot be undone."))
                setData(defaultData());
            }} />
        )}
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ STYLES ══ */

function AppStyles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

      .root {
        --ink:#1C1712; --soft:#5b5348; --paper:#FAF7F1; --card:#FFF;
        --line:#E5DAC8; --gold:#B8860B; --gold-lt:#EFE0B0; --gold-pale:#FAF3DE;
        --burg:#8A2E2E; --grn:#2F6B4F;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;
        background:var(--paper); color:var(--ink);
        min-height:100%; max-width:760px; margin:0 auto; padding-bottom:60px;
      }

      .loading { display:flex; flex-direction:column; align-items:center; justify-content:center;
                 height:300px; gap:12px; color:var(--soft); }
      .spinner { width:24px; height:24px; border-radius:50%; border:3px solid var(--line);
                 border-top-color:var(--gold); animation:spin .8s linear infinite; }
      @keyframes spin { to { transform:rotate(360deg); } }

      .hdr      { display:flex; justify-content:space-between; align-items:flex-end;
                  padding:18px 16px 12px; border-bottom:1px solid var(--line); }
      .eyebrow  { font-size:11px; letter-spacing:.05em; color:var(--gold); font-weight:700; margin-bottom:2px; }
      .hdr-name { font-family:Georgia,"Times New Roman",serif; font-size:20px; font-weight:600; }
      .save-dot { font-size:11px; color:var(--soft); }
      .save-dot.saving { color:var(--gold); }

      .nav      { display:flex; gap:4px; padding:8px 10px; border-bottom:1px solid var(--line);
                  background:var(--paper); position:sticky; top:0; z-index:5; }
      .nav-btn  { flex:1; padding:9px 10px; border-radius:999px; border:1px solid transparent;
                  background:transparent; color:var(--soft); font-size:13px; font-weight:600;
                  cursor:pointer; white-space:nowrap; }
      .nav-active { background:var(--ink); color:var(--gold-lt); }

      .main     { padding:14px 12px 20px; }
      .tab-body { display:flex; flex-direction:column; gap:12px; }
      .tab-body h2 { font-family:Georgia,"Times New Roman",serif; font-size:18px; }
      .row-between { display:flex; justify-content:space-between; align-items:center; gap:10px; }

      /* ── period selector ── */
      .periodbar { display:flex; flex-direction:column; gap:8px; }
      .seg      { display:flex; gap:3px; background:var(--card); border:1px solid var(--line);
                  border-radius:999px; padding:3px; }
      .seg-btn  { flex:1; padding:8px 4px; border:none; background:transparent; border-radius:999px;
                  font-size:12px; font-weight:700; color:var(--soft); cursor:pointer;
                  letter-spacing:.02em; }
      .seg-on   { background:var(--ink); color:var(--gold-lt); }
      .navline  { display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .navbtn   { width:34px; height:34px; border-radius:50%; border:1px solid var(--line);
                  background:var(--card); color:var(--ink); display:flex; align-items:center;
                  justify-content:center; cursor:pointer; flex-shrink:0; }
      .navbtn:disabled { opacity:.35; cursor:default; }
      .navlabel { flex:1; text-align:center; font-size:13px; font-weight:700;
                  display:flex; align-items:center; justify-content:center; gap:7px; flex-wrap:wrap; }
      .live-dot { background:var(--grn); color:#fff; border-radius:999px; padding:1px 8px;
                  font-size:9.5px; font-weight:800; letter-spacing:.04em; }

      /* ── executive scorecard (dark) ── */
      .exec     { background:var(--ink); border-radius:16px; padding:16px; color:#fff; }
      .exec-hd  { display:flex; justify-content:space-between; align-items:baseline; gap:8px;
                  font-size:10.5px; font-weight:800; letter-spacing:.09em;
                  color:var(--gold); text-transform:uppercase; margin-bottom:13px; flex-wrap:wrap; }
      .exec-period { color:#9c9384; letter-spacing:.02em; font-size:10px; text-transform:none; }
      .exec-hero{ display:flex; justify-content:space-between; align-items:flex-end; gap:14px; flex-wrap:wrap; }
      .eh-val   { font-family:Georgia,"Times New Roman",serif; font-size:33px; font-weight:600;
                  color:var(--gold-lt); line-height:1; font-variant-numeric:tabular-nums; }
      .eh-lbl   { font-size:10px; color:#9c9384; font-weight:700; text-transform:uppercase;
                  letter-spacing:.05em; margin-top:5px; }
      .eh-side  { display:flex; flex-direction:column; gap:3px; min-width:150px; flex:1; }
      .eh-row   { display:flex; justify-content:space-between; gap:12px; font-size:12px; color:#9c9384; }
      .eh-row b { color:#fff; font-variant-numeric:tabular-nums; }
      .exec-bar { height:6px; background:#332c24; border-radius:4px; overflow:hidden; margin:13px 0 0; }
      .exec-bar-fill { height:100%; background:var(--gold); }
      .exec-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-top:14px; }
      .eg       { background:#ffffff0d; border-radius:9px; padding:8px 4px; text-align:center; }
      .eg-v     { font-size:14.5px; font-weight:700; color:#fff; font-variant-numeric:tabular-nums;
                  line-height:1.2; }
      .eg-l     { font-size:8.5px; color:#9c9384; font-weight:700; margin-top:3px;
                  text-transform:uppercase; letter-spacing:.02em; }
      .exec-foot{ font-size:11px; color:#9c9384; margin-top:11px; text-align:center;
                  border-top:1px solid #332c24; padding-top:10px; }

      /* ── attention ── */
      .attn     { background:var(--card); border:1px solid var(--line); border-radius:13px; padding:13px 14px; }
      .attn-hd  { display:flex; align-items:center; gap:6px; font-size:10.5px; font-weight:800;
                  color:var(--burg); text-transform:uppercase; letter-spacing:.05em; margin-bottom:9px; }
      .attn-row { display:flex; gap:8px; font-size:12.5px; line-height:1.55; padding:5px 0;
                  border-top:1px solid var(--line); }
      .attn-row:first-of-type { border-top:none; }
      .sev      { flex-shrink:0; font-size:11px; line-height:1.5; }

      /* ── panels ── */
      .panel    { background:var(--card); border:1px solid var(--line); border-radius:13px; padding:13px 14px; }
      .panel-hd { font-family:Georgia,"Times New Roman",serif; font-size:14.5px;
                  font-weight:600; margin-bottom:10px; }

      /* comparison */
      .cmp-head { display:grid; grid-template-columns:1.15fr .85fr .85fr .7fr; gap:6px;
                  font-size:9.5px; font-weight:800; color:var(--soft); text-transform:uppercase;
                  letter-spacing:.02em; padding-bottom:6px; border-bottom:1px solid var(--line); }
      .cmp-cur  { color:var(--gold); }
      .cmp-row  { display:grid; grid-template-columns:1.15fr .85fr .85fr .7fr; gap:6px;
                  align-items:center; padding:7px 0; border-bottom:1px solid var(--line); font-size:12.5px; }
      .cmp-row:last-child { border-bottom:none; }
      .cmp-lbl  { color:var(--soft); font-weight:600; font-size:11.5px; }
      .cmp-a    { font-weight:700; font-variant-numeric:tabular-nums; }
      .cmp-b    { color:var(--soft); font-variant-numeric:tabular-nums; }
      .delta    { font-size:11px; font-weight:800; border-radius:999px; padding:1px 7px;
                  border:1px solid; text-align:center; white-space:nowrap; }
      .delta-up   { background:#2F6B4F14; color:var(--grn);  border-color:#2F6B4F44; }
      .delta-down { background:#8A2E2E12; color:var(--burg); border-color:#8A2E2E40; }
      .delta-flat { background:var(--paper); color:var(--soft); border-color:var(--line); }
      .delta-none { background:transparent; color:var(--soft); border-color:transparent; }
      .partial-note { font-size:11px; color:#7a5c09; background:var(--gold-pale);
                      border:1px solid var(--gold-lt); border-radius:8px; padding:8px 10px;
                      margin-top:9px; line-height:1.5; }

      /* division rollup */
      .divrow   { padding:9px 0; border-bottom:1px solid var(--line); }
      .divrow:last-child { border-bottom:none; }
      .divtop   { display:flex; justify-content:space-between; align-items:center; gap:8px; }
      .divname  { font-size:12.5px; font-weight:600; display:flex; align-items:center; gap:7px;
                  overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .divdot   { width:8px; height:8px; border-radius:2px; flex-shrink:0; display:inline-block; }
      .divrev   { font-size:13.5px; font-weight:700; font-variant-numeric:tabular-nums; }
      .divbar   { height:5px; background:var(--line); border-radius:3px; overflow:hidden; margin:6px 0 5px; }
      .divbar-fill { height:100%; border-radius:3px; }
      .divmeta  { display:flex; gap:12px; font-size:10.5px; color:var(--soft); flex-wrap:wrap; }

      /* stream / person performance rows */
      .sp-row   { padding:8px 0; border-bottom:1px solid var(--line); }
      .sp-row:last-child { border-bottom:none; }
      .sp-top   { display:flex; justify-content:space-between; gap:8px; align-items:baseline; }
      .sp-nm    { font-size:12.5px; font-weight:600; overflow:hidden;
                  text-overflow:ellipsis; white-space:nowrap; }
      .sp-rv    { font-size:13px; font-weight:700; color:var(--gold);
                  font-variant-numeric:tabular-nums; white-space:nowrap; }
      .sp-meta  { display:flex; gap:11px; font-size:10.5px; color:var(--soft); margin-top:3px; flex-wrap:wrap; }

      /* recurring */
      .rec-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
      .rec      { background:var(--paper); border:1px solid var(--line); border-radius:10px;
                  padding:9px 11px; text-align:center; }
      .rec-v    { font-size:16px; font-weight:700; font-variant-numeric:tabular-nums; }
      .rec-l    { font-size:9.5px; color:var(--soft); font-weight:700; margin-top:3px;
                  text-transform:uppercase; letter-spacing:.02em; }

      /* goal allocation */
      .alloc    { border-radius:10px; padding:11px 13px; margin-top:10px; border:1px solid; }
      .alloc-ok    { background:#2F6B4F0D; border-color:#2F6B4F33; }
      .alloc-under { background:var(--gold-pale); border-color:var(--gold-lt); }
      .alloc-over  { background:#8A2E2E0D; border-color:#8A2E2E33; }
      .alloc-row   { display:flex; justify-content:space-between; gap:10px; font-size:12px;
                     color:var(--soft); padding:2px 0; }
      .alloc-row b { color:var(--ink); font-variant-numeric:tabular-nums; }
      .alloc-hi    { border-top:1px solid var(--line); margin-top:5px; padding-top:6px; font-weight:700; }
      .alloc-hi b  { color:var(--gold); }
      .alloc-note  { font-size:11px; color:var(--soft); margin-top:6px; line-height:1.5; }

      /* pulse */
      .pulse      { background:var(--ink); border-radius:14px; padding:14px 16px; }
      .pulse-hd   { display:flex; justify-content:space-between; align-items:baseline; gap:8px;
                    font-size:11px; font-weight:800; letter-spacing:.09em;
                    color:var(--gold); text-transform:uppercase; margin-bottom:11px; flex-wrap:wrap; }
      .pulse-week { font-size:9.5px; color:#9c9384; letter-spacing:.02em; text-transform:none; }
      .pulse-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
      .pl         { text-align:center; }
      .pl-v       { font-size:19px; font-weight:700; color:#FFF; font-variant-numeric:tabular-nums; line-height:1.15; }
      .pl-v.gold  { color:var(--gold-lt); }
      .pl-l       { font-size:9.5px; color:#a99f8e; font-weight:600; margin-top:3px;
                    text-transform:uppercase; letter-spacing:.03em; }

      .company-block { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:14px; }

      .g2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:8px 0; }

      .field     { display:flex; flex-direction:column; gap:5px; }
      .field-lbl { font-size:11px; font-weight:700; color:var(--soft); }
      .input     { border:1px solid var(--line); border-radius:9px; padding:9px 11px;
                   font-size:15px; background:#fff; color:var(--ink); width:100%; }
      .input:focus { outline:2px solid var(--gold); outline-offset:1px; }

      .calc-disp { background:var(--gold-pale); border:1px solid var(--gold-lt); border-radius:9px;
                   padding:9px 11px; font-size:16px; font-weight:700; color:var(--gold); }

      .sect-lbl { font-size:10.5px; font-weight:800; color:var(--soft); letter-spacing:.04em;
                  text-transform:uppercase; padding:10px 0 2px;
                  border-top:1px solid var(--line); margin-top:4px; }

      .cg     { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:6px 0; }
      .ci     { background:var(--paper); border:1px solid var(--line); border-radius:10px; padding:9px 11px; }
      .ci-hero { background:#B8860B0D; border-color:#B8860B44; }
      .ci-lbl { font-size:10.5px; font-weight:700; color:var(--soft); }
      .ci-val { font-size:16px; font-weight:700; margin-top:2px; font-variant-numeric:tabular-nums; }

      .card       { background:var(--card); border:1px solid var(--line); border-radius:13px; overflow:hidden; }
      .card-head  { display:flex; align-items:flex-start; justify-content:space-between;
                    gap:10px; padding:12px 14px; cursor:pointer; user-select:none; }
      .card-head:active { background:var(--paper); }
      .card-head-left { flex:1; min-width:0; }
      .card-name  { font-size:14.5px; font-weight:700; }
      .card-name-row { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
      .div-chip   { border-radius:999px; padding:1px 8px; font-size:9.5px; font-weight:800;
                    border:1px solid; letter-spacing:.02em; }
      .type-tag   { background:#6B4FA815; color:#6B4FA8; border:1px solid #6B4FA840;
                    border-radius:999px; padding:1px 7px; font-size:9.5px; font-weight:800; }
      .role-tag   { background:var(--gold-pale); color:var(--gold); border:1px solid var(--gold-lt);
                    border-radius:999px; padding:1px 9px; font-size:10.5px; font-weight:700; }
      .card-meta  { font-size:12.5px; color:var(--soft); margin-top:4px;
                    display:flex; flex-wrap:wrap; gap:5px; align-items:center; }
      .tag-pill   { background:var(--gold-pale); color:var(--gold); border:1px solid var(--gold-lt);
                    border-radius:999px; padding:1px 8px; font-size:11px; font-weight:700; }
      .chevron    { color:var(--soft); flex-shrink:0; margin-top:2px; }
      .tap-hint   { font-size:11px; color:var(--gold); margin-top:5px; font-weight:600; }
      .card-body  { padding:4px 14px 14px; border-top:1px solid var(--line);
                    display:flex; flex-direction:column; gap:8px; }
      .gold    { color:var(--gold); }
      .dim     { color:var(--soft); font-style:italic; }
      .fw7     { font-weight:700; }
      .sep     { opacity:.4; }

      .progbar      { height:5px; background:var(--line); border-radius:4px; overflow:hidden; margin-top:6px; }
      .progbar-fill { height:100%; background:var(--gold); transition:width .3s; }

      .score-line { display:flex; flex-wrap:wrap; gap:4px 9px; margin-top:6px; align-items:center; }
      .sl         { font-size:11.5px; color:var(--soft); white-space:nowrap; }
      .sl b       { color:var(--ink); font-weight:700; font-variant-numeric:tabular-nums; }
      .sl-rev b   { color:var(--gold); }
      .sl-pct     { font-size:11px; font-weight:800; border-radius:999px;
                    padding:1px 9px; border:1px solid; white-space:nowrap; }
      .sl-pct.ok  { background:#2F6B4F14; color:var(--grn);  border-color:#2F6B4F44; }
      .sl-pct.mid { background:var(--gold-pale); color:#7a5c09; border-color:var(--gold-lt); }
      .sl-pct.low { background:#8A2E2E12; color:var(--burg); border-color:#8A2E2E40; }

      .funnel-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .fn-cell     { display:flex; flex-direction:column; gap:4px; }
      .fn-lbl      { font-size:10.5px; font-weight:700; color:var(--soft); }

      .rate-strip { display:grid; grid-template-columns:repeat(2,1fr); gap:6px; margin-top:4px; }
      .rt         { background:var(--paper); border:1px solid var(--line); border-radius:8px;
                    padding:7px 9px; display:flex; justify-content:space-between; align-items:center; }
      .rt span    { font-size:10.5px; color:var(--soft); font-weight:600; }
      .rt b       { font-size:13px; font-weight:700; font-variant-numeric:tabular-nums; }

      .rep-list { display:flex; flex-direction:column; gap:4px; }
      .rep-row  { display:grid; grid-template-columns:1fr auto auto; gap:10px;
                  font-size:12.5px; padding:6px 9px; background:var(--paper);
                  border:1px solid var(--line); border-radius:8px; align-items:center; }
      .rep-nm { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .rep-q  { color:var(--soft); white-space:nowrap; }
      .rep-rv { font-weight:700; color:var(--gold); white-space:nowrap; }

      .matrix { display:flex; flex-direction:column; gap:5px; }
      .mx-row { display:grid; grid-template-columns:1.6fr .8fr .9fr; gap:8px; align-items:center; }
      .mx-name { font-size:12.5px; font-weight:600; line-height:1.25;
                 display:flex; flex-direction:column; overflow:hidden; }
      .mx-px  { font-size:10px; color:var(--soft); font-weight:500; }
      .mx-in  { padding:7px 8px; font-size:14px; }
      .mx-in-static { padding:7px 8px; font-size:13px; font-weight:700; text-align:center; }
      .mx-rev { font-size:13px; font-weight:700; color:var(--gold); text-align:right; }
      .mx-total { background:var(--gold-pale); border:1px solid var(--gold-lt);
                  border-radius:9px; padding:8px 7px; margin-top:3px; }

      .btn-primary   { display:flex; align-items:center; gap:6px; padding:9px 14px;
                       background:var(--ink); color:var(--gold-lt); border:none; border-radius:999px;
                       font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap; }
      .btn-secondary { display:flex; align-items:center; gap:6px; padding:8px 14px; background:#fff;
                       border:1px solid var(--line); border-radius:999px; font-size:13px;
                       font-weight:600; cursor:pointer; color:var(--soft); }
      .btn-action    { display:flex; align-items:center; gap:6px; padding:9px 14px; background:#fff;
                       border:1px solid var(--line); border-radius:9px; font-size:13px;
                       font-weight:600; cursor:pointer; color:var(--ink); }
      .btn-danger    { color:var(--burg); border-color:#e6c9c9; }
      .btn-close-week{ display:flex; align-items:center; justify-content:center; gap:7px;
                       width:100%; padding:13px; margin-top:6px; background:var(--ink);
                       color:var(--gold-lt); border:none; border-radius:12px;
                       font-size:14px; font-weight:700; cursor:pointer; }
      .remove-btn    { display:flex; align-items:center; gap:6px; margin-top:4px; background:transparent;
                       border:1px solid #e6c9c9; border-radius:8px; color:var(--burg);
                       font-size:12.5px; font-weight:600; padding:7px 12px; cursor:pointer; }
      .icon-btn      { background:transparent; border:none; cursor:pointer; color:var(--soft); padding:4px; }

      .total-bar { display:flex; justify-content:space-between; align-items:center;
                   background:var(--gold-pale); border:1px solid var(--gold-lt);
                   border-radius:10px; padding:11px 14px; font-size:13.5px; color:var(--soft); }
      .readonly-note { font-size:11.5px; color:var(--soft); text-align:center; font-style:italic;
                       background:var(--gold-pale); border:1px solid var(--gold-lt);
                       border-radius:9px; padding:9px 12px; line-height:1.5; }

      .empty-state { text-align:center; padding:28px 16px; display:flex; flex-direction:column;
                     align-items:center; gap:8px; }
      .e-icon { font-size:36px; }
      .e-h    { font-size:15px; font-weight:700; }
      .e-sub  { font-size:13px; color:var(--soft); max-width:310px; }
      .hint-sm { font-size:12px; color:var(--soft); line-height:1.5; }
      .hint-xs { font-size:11px; color:var(--soft); line-height:1.5; font-style:italic; }
      .center  { text-align:center; }

      /* settings */
      .settings-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
      .setlist { display:flex; flex-direction:column; gap:9px; }
      .setrow  { background:var(--card); border:1px solid var(--line); border-radius:11px; padding:10px 12px; }
      .setname { font-size:13px; font-weight:700; margin-bottom:7px; }
      .setgrid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
      .sf      { display:flex; flex-direction:column; gap:3px; }
      .sf span { font-size:10px; font-weight:700; color:var(--soft); }
      .sf .input { padding:7px 9px; font-size:13.5px; }

      .histlist { display:flex; flex-direction:column; gap:7px; }
      .histrow  { display:flex; align-items:center; gap:10px; background:var(--card);
                  border:1px solid var(--line); border-radius:10px; padding:9px 11px; }
      .histmain { flex:1; min-width:0; }
      .histwk   { font-size:12.5px; font-weight:700; }
      .histdates{ font-size:10.5px; color:var(--soft); margin-top:2px; }
      .histrev  { font-size:13.5px; font-weight:700; color:var(--gold);
                  font-variant-numeric:tabular-nums; white-space:nowrap; }
      .histdel  { background:transparent; border:none; color:var(--burg); cursor:pointer;
                  padding:4px; flex-shrink:0; }

      .storage-note { background:var(--gold-pale); border:1px solid var(--gold-lt); border-radius:10px;
                      padding:12px 14px; font-size:12.5px; line-height:1.65; margin-bottom:8px; }
      .storage-note code { background:#fff; border:1px solid var(--line); border-radius:4px;
                           padding:1px 5px; font-size:11.5px; }

      /* charts */
      .chart-card  { background:var(--card); border:1px solid var(--line); border-radius:13px; overflow:hidden; }
      .chart-head  { display:flex; justify-content:space-between; align-items:center; gap:10px;
                     padding:12px 14px; cursor:pointer; user-select:none; }
      .chart-head:active { background:var(--paper); }
      .chart-title { font-size:13.5px; font-weight:700; }
      .chart-sub   { font-size:10.5px; color:var(--soft); margin-top:2px; }
      .chart-body  { padding:0 8px 12px 0; border-top:1px solid var(--line); padding-top:12px; }

      /* modal */
      .overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:100;
                 display:flex; align-items:flex-end; justify-content:center; }
      .modal   { background:var(--card); border-radius:20px 20px 0 0; width:100%; max-width:760px;
                 max-height:88vh; display:flex; flex-direction:column; overflow:hidden; }
      .modal-top { display:flex; justify-content:space-between; align-items:center;
                   padding:16px 16px 10px; border-bottom:1px solid var(--line); flex-shrink:0; }
      .modal-title { font-size:16px; font-weight:700; }
      .modal-search { margin:10px 12px 4px; width:calc(100% - 24px); flex-shrink:0; }
      .modal-body { overflow-y:auto; padding:4px 12px 32px; }
      .cat-div  { font-size:11px; font-weight:800; letter-spacing:.04em; padding:12px 4px 4px; }
      .cat-row  { width:100%; background:transparent; border:none; border-radius:10px; padding:10px 12px;
                  text-align:left; cursor:pointer; display:flex; justify-content:space-between;
                  align-items:center; gap:12px; }
      .cat-row:hover { background:var(--gold-pale); }
      .cat-name { font-size:14px; font-weight:600; display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
      .cat-px   { font-size:12px; color:var(--soft); white-space:nowrap; }
      .added-tag { background:var(--grn); color:#fff; border-radius:999px; padding:1px 6px;
                   font-size:9.5px; font-weight:800; }

      /* responsive */
      @media (min-width:540px) {
        .funnel-grid { grid-template-columns:repeat(4,1fr); }
        .rate-strip  { grid-template-columns:repeat(4,1fr); }
        .rec-grid    { grid-template-columns:repeat(4,1fr); }
        .exec-grid   { grid-template-columns:repeat(8,1fr); }
        .eg-l        { font-size:9px; }
        .setgrid     { grid-template-columns:repeat(4,1fr); }
      }
      @media (max-width:360px) {
        .exec-grid { grid-template-columns:repeat(2,1fr); }
        .eh-val    { font-size:28px; }
      }

      @media print {
        .nav, .periodbar, .btn-primary, .btn-secondary, .btn-action, .btn-close-week,
        .remove-btn, .save-dot, .tap-hint, .histdel { display:none !important; }
        .root { max-width:100%; }
        .card-body, .chart-body { display:block !important; }
      }
    `}</style>
  );
}
