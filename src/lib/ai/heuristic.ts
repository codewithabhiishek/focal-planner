import type {
  AnalyzeInput,
  Category,
  Goal,
  SubtaskSuggestion,
  TaskAnalysis,
} from "../../types";

/* ------------------------------------------------------------------ */
/* Deterministic language understanding — no network, no key required. */
/* ------------------------------------------------------------------ */

const STOP = new Set([
  "the", "a", "an", "to", "for", "of", "in", "on", "my", "me", "and", "or",
  "with", "about", "some", "into", "our", "your", "get", "got", "bit",
]);

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

interface Signal {
  id: string;
  words: string[];
}

const SIGNALS: Signal[] = [
  {
    id: "career",
    words: [
      "recruiter", "internship", "internships", "apply", "application",
      "applications", "resume", "cv", "interview", "cover", "letter",
      "linkedin", "job", "jobs", "hiring", "referral", "positions",
    ],
  },
  {
    id: "devops",
    words: [
      "deploy", "deployment", "kubernetes", "k8s", "docker", "terraform",
      "pipeline", "devops", "aws", "infra", "infrastructure", "server",
      "cluster", "helm", "linux", "networking", "monitoring", "staging",
      "production", "ci", "cd",
    ],
  },
  {
    id: "portfolio",
    words: [
      "portfolio", "website", "landing", "page", "mobile", "bug",
      "responsive", "css", "design", "ui", "site",
    ],
  },
  {
    id: "learning",
    words: [
      "learn", "learning", "study", "course", "tutorial", "read",
      "practice", "basics", "research", "notes", "documentation", "docs",
    ],
  },
  {
    id: "admin",
    words: [
      "bank", "call", "email", "invoice", "pay", "payment", "insurance",
      "form", "forms", "paperwork", "schedule", "appointment", "renew",
      "cancel", "hr", "office", "register", "sign", "send", "reply",
      "respond", "book",
    ],
  },
  {
    id: "errand",
    words: [
      "groceries", "grocery", "buy", "shopping", "pick", "pharmacy",
      "laundry", "clean", "cook", "gift", "post", "package",
    ],
  },
];

export function signalScores(title: string): Record<string, number> {
  const lower = title.toLowerCase();
  const toks = tokenize(title);
  const out: Record<string, number> = {};
  for (const s of SIGNALS) {
    let n = 0;
    for (const w of s.words) {
      if (toks.includes(w) || (w.length > 2 && lower.includes(w))) n++;
    }
    if (n > 0) out[s.id] = n;
  }
  return out;
}

export function dominantSignal(title: string): string | null {
  const scores = signalScores(title);
  let best: string | null = null;
  let bestN = 0;
  for (const [k, v] of Object.entries(scores)) {
    if (v > bestN) {
      best = k;
      bestN = v;
    }
  }
  return best;
}

/* ---- deadline / urgency parsing from plain language ---- */

export interface DeadlineExtract {
  deadline: number | null;
  auto: boolean;
  urgencyHint: number;
}

export function extractDeadline(title: string, now = Date.now()): DeadlineExtract {
  const t = title.toLowerCase();
  let urgencyHint = 0;
  if (/\b(asap|urgent|urgently|critical|today!?)\b/.test(t)) urgencyHint = 0.85;

  const m = t.match(/\b(?:before|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const mer = m[3];
    if (mer === "pm" && h < 12) h += 12;
    if (mer === "am" && h === 12) h = 0;
    const d = new Date(now);
    d.setHours(h, min, 0, 0);
    if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    return { deadline: d.getTime(), auto: true, urgencyHint: 1 };
  }
  if (/\btoday\b|\btonight\b/.test(t)) {
    const d = new Date(now);
    d.setHours(18, 0, 0, 0);
    if (d.getTime() <= now) {
      d.setHours(23, 30, 0, 0);
      if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    }
    return { deadline: d.getTime(), auto: true, urgencyHint: 0.95 };
  }
  if (/\btomorrow\b/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(12, 0, 0, 0);
    return { deadline: d.getTime(), auto: true, urgencyHint: 0.7 };
  }
  if (/\bthis week\b/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 4);
    d.setHours(17, 0, 0, 0);
    return { deadline: d.getTime(), auto: true, urgencyHint: 0.5 };
  }
  return { deadline: null, auto: false, urgencyHint };
}

/* ---- duration estimation from verbs ---- */

const DURATION_RULES: Array<[RegExp, number]> = [
  [/\b(reply|respond|email|call|message|text|send|confirm|sign|renew|pay|book)\b/, 10],
  [/\b(update|fix|tweak|review|check|schedule|register|buy|pick|clean|cook)\b/, 25],
  [/\b(apply|application|write|draft|prepare|organize|plan)\b/, 45],
  [/\b(learn|study|read|research|build|implement|finish|complete|deploy|document|practice)\b/, 60],
];

export function estimateMinutes(title: string): number {
  const t = title.toLowerCase();
  for (const [re, min] of DURATION_RULES) if (re.test(t)) return min;
  return 30;
}

/* ---- goal matching ---- */

const GOAL_SIGNAL_BOOST: Array<[RegExp, string]> = [
  [/intern|career|job/i, "career"],
  [/devops|kubernetes|k8s|deploy|infra/i, "devops"],
  [/portfolio|site|website/i, "portfolio"],
  [/learn|study|skill/i, "learning"],
];

function matchGoal(
  title: string,
  goals: Goal[]
): { goal: Goal | null; overlap: number } {
  const toks = tokenize(title);
  const sigs = signalScores(title);
  let best: Goal | null = null;
  let bestScore = 0;

  for (const g of goals.filter((g) => g.active)) {
    const gtoks = tokenize(`${g.title} ${g.description ?? ""}`);
    let inter = 0;
    for (const t of toks) {
      if (gtoks.some((gt) => gt === t || (t.length > 3 && gt.startsWith(t)) || (gt.length > 3 && t.startsWith(gt)))) {
        inter++;
      }
    }
    let score = toks.length ? inter / Math.max(2, Math.min(toks.length, 4)) : 0;
    for (const [re, sig] of GOAL_SIGNAL_BOOST) {
      if (re.test(g.title) && (sigs[sig] ?? 0) > 0) score += 0.45;
    }
    if (score > bestScore) {
      bestScore = score;
      best = g;
    }
  }
  return { goal: bestScore >= 0.18 ? best : null, overlap: Math.min(1, bestScore) };
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/* ---- the analyzer itself ---- */

export function isTaskBroad(title: string, estMinutes?: number | null): boolean {
  const lower = title.toLowerCase();
  if (estMinutes && estMinutes >= 45) return true;
  const broadTriggers = [
    "work on", "learn", "study", "prepare", "build", "finish",
    "complete", "practice", "master", "develop", "plan", "research"
  ];
  return broadTriggers.some((t) => lower.startsWith(t) || lower.includes(` ${t} `));
}

export function suggestNextAction(title: string, maxMinutes?: number | null): SubtaskSuggestion {
  const sig = dominantSignal(title) ?? "generic";
  const templates = BREAKDOWN_TEMPLATES[sig] ?? BREAKDOWN_TEMPLATES.generic;
  const first = templates[0] ?? { title: `First 10-minute slice of ${title}`, minutes: 10 };

  if (maxMinutes && maxMinutes > 0 && (first.minutes == null || first.minutes > maxMinutes)) {
    return {
      title: `First ${maxMinutes}-min focused block on “${title}”`,
      minutes: maxMinutes,
    };
  }

  return first;
}

export function analyzeHeuristic(
  input: AnalyzeInput,
  goals: Goal[],
  now = Date.now()
): TaskAnalysis {
  const title = input.title;
  const sigs = signalScores(title);
  const { goal, overlap } = matchGoal(title, goals);

  const lifeAdmin = (sigs.admin ?? 0) > 0 && !goal;
  const errand = (sigs.errand ?? 0) > 0 && !goal;

  let goalRelevance = clamp(0.2 + overlap * 0.72, 0.08, 0.97);
  if (lifeAdmin) goalRelevance = clamp(goalRelevance * 0.5, 0.08, 0.3);
  if (errand) goalRelevance = clamp(goalRelevance * 0.35, 0.06, 0.22);

  const est = input.estMinutes ?? estimateMinutes(title);
  const hoursToDeadline = input.deadline ? (input.deadline - now) / 3.6e6 : null;
  const urgent =
    (hoursToDeadline !== null && hoursToDeadline < 24) ||
    extractDeadline(title, now).urgencyHint >= 0.85;

  let impact = 0.34;
  if (goalRelevance > 0.6) impact += 0.3;
  else if (goalRelevance > 0.35) impact += 0.15;
  if (urgent) impact += 0.16;
  if (est <= 15) impact += 0.12; // quick win
  if (sigs.learning) impact += 0.05; // compounds
  impact = clamp(impact, 0.1, 0.95);

  let category: Category;
  if (urgent && goalRelevance >= 0.25) category = "DO_NOW";
  else if (urgent) category = "SOON";
  else if (goalRelevance >= 0.55) category = est <= 20 ? "DO_NOW" : "SOON";
  else if (goalRelevance >= 0.3 || (hoursToDeadline !== null && hoursToDeadline < 72))
    category = "SOON";
  else category = "LATER";

  /* ---- reason, in plain words ---- */
  let reason: string;
  const goalName = goal ? `“${goal.title}”` : "your goals";
  if (sigs.career && goal) reason = `Directly moves ${goalName} forward — recruiters reward speed.`;
  else if (sigs.devops && goal) reason = `Builds the exact skills ${goalName} needs.`;
  else if (sigs.portfolio && goal) reason = `Visible progress on ${goalName} — shipping beats polishing.`;
  else if (sigs.learning && goal) reason = `Compound skill work toward ${goalName}. Best with real focus time.`;
  else if (sigs.learning) reason = `Learning compounds — worth a focused block, not a spare minute.`;
  else if (lifeAdmin) reason = `Small admin — clear it before it grows into something bigger.`;
  else if (errand) reason = `Low-stakes errand. Batch it with other small tasks.`;
  else if (goal) reason = `Strong fit with ${goalName}.`;
  else reason = `No strong goal match — maintenance work, do it when energy is low.`;
  if (urgent) reason = `Time-sensitive. ${reason}`;

  const isBroad = isTaskBroad(title, est);
  const nextAction = isBroad ? suggestNextAction(title, 15).title : undefined;

  return {
    goalRelevance,
    impact,
    category,
    reason,
    goalId: goal?.id ?? null,
    estimatedMinutes: input.estMinutes ?? est,
    urgencyHint: extractDeadline(title, now).urgencyHint,
    confidence: 0.9,
    isBroad,
    suggestedNextAction: nextAction,
    source: "heuristic",
    analyzedAt: now,
  };
}

/* ---- breaking big / avoided tasks into steps ---- */

const BREAKDOWN_TEMPLATES: Record<string, SubtaskSuggestion[]> = {
  career: [
    { title: "Update resume with latest project", minutes: 20 },
    { title: "Find 5 relevant open positions", minutes: 15 },
    { title: "Apply to position #1", minutes: 20 },
  ],
  devops: [
    { title: "Outline the structure in bullet points", minutes: 10 },
    { title: "Write the first section, badly", minutes: 25 },
    { title: "Add one working command example", minutes: 10 },
  ],
  portfolio: [
    { title: "Reproduce the issue on a real device", minutes: 10 },
    { title: "Isolate the failing component", minutes: 20 },
    { title: "Ship the smallest possible fix", minutes: 15 },
  ],
  learning: [
    { title: "Skim the official overview, no notes", minutes: 10 },
    { title: "Do one small hands-on exercise", minutes: 25 },
    { title: "Write down 3 key takeaways", minutes: 10 },
  ],
  generic: [
    { title: "Write one sentence: what does “done” look like?", minutes: 5 },
    { title: "Do the first 10-minute slice", minutes: 10 },
    { title: "Note the very next physical step", minutes: 5 },
  ],
};

export function suggestBreakdown(title: string): SubtaskSuggestion[] {
  const sig = dominantSignal(title);
  return BREAKDOWN_TEMPLATES[sig ?? "generic"] ?? BREAKDOWN_TEMPLATES.generic;
}
