import { v4 as uuid } from "uuid";
import type { Goal, Task } from "../types";
import { analyzeHeuristic } from "./ai/heuristic";

/**
 * First-run sample data, mirroring the product story:
 * a recruiter reply due at 5 PM, an avoided "apply for internships" task,
 * a blocked doc task, life admin, and an errand.
 * Deadlines are computed relative to "now" so the demo always reads true.
 */
export function buildSample(): { goals: Goal[]; tasks: Task[] } {
  const now = Date.now();
  const H = 3.6e6;
  const D = 24 * H;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  const goals: Goal[] = [
    {
      id: uuid(),
      title: "Get a DevOps internship",
      description: "Applications, recruiter replies, and the skills that back them up.",
      targetDate: iso(now + 21 * D),
      active: true,
      isPrimary: true,
      createdAt: now - 12 * D,
    },
    {
      id: uuid(),
      title: "Ship portfolio v2",
      description: "Polish the site and deploy it to production.",
      targetDate: iso(now + 10 * D),
      active: true,
      isPrimary: false,
      createdAt: now - 9 * D,
    },
    {
      id: uuid(),
      title: "Learn Kubernetes",
      description: "Paused until the internship push settles.",
      targetDate: null,
      active: false,
      isPrimary: false,
      createdAt: now - 30 * D,
    },
  ];

  const g = (i: number) => goals[i].id;

  let recruiterDl = new Date(now);
  recruiterDl.setHours(17, 0, 0, 0);
  if (recruiterDl.getTime() - now < 45 * 60_000) {
    recruiterDl = new Date(now + 2.5 * H);
  }

  const mk = (
    title: string,
    over: Partial<Omit<Task, "analysis">> & {
      goalIdx?: number | null;
      createdAt: number;
      analysis?: Partial<Task["analysis"]>;
    }
  ): Task => {
    const { goalIdx = null, createdAt, ...rest } = over;
    const analysis = analyzeHeuristic(
      { title, deadline: null, estMinutes: null },
      goalIdx == null ? goals.filter((_, i) => false) : goals,
      createdAt
    );
    const base: Task = {
      id: uuid(),
      title,
      createdAt,
      deadline: null,
      deadlineAuto: false,
      estMinutes: analysis.estimatedMinutes,
      status: "active",
      blocked: false,
      postponeCount: 0,
      decayCount: 0,
      timeStarved: false,
      analysis: {
        ...analysis,
        goalId: goalIdx == null ? null : g(goalIdx),
        goalRelevance: goalIdx == null ? analysis.goalRelevance : Math.max(analysis.goalRelevance, 0.72),
      },
    };
    return { ...base, ...rest, analysis: { ...base.analysis, ...(rest.analysis ?? {}) } };
  };

  const tasks: Task[] = [
    mk("Reply to recruiter", {
      createdAt: now - 5 * H,
      deadline: recruiterDl.getTime(),
      deadlineAuto: true,
      estMinutes: 10,
      goalIdx: 0,
      analysis: { goalRelevance: 0.93, impact: 0.9, category: "DO_NOW", reason: "Recruiters move fast — a same-day reply keeps you in the running.", urgencyHint: 1 },
    }),
    mk("Apply to 3 internship postings", {
      createdAt: now - 6 * D,
      deadline: now + 2 * D,
      estMinutes: 45,
      goalIdx: 0,
      postponeCount: 3,
      lastPostponedAt: now - 1 * D,
      analysis: { goalRelevance: 0.9, impact: 0.85, category: "DO_NOW", reason: "Volume matters — each application raises your odds.", urgencyHint: 0.2 },
    }),
    mk("Fix portfolio mobile nav bug", {
      createdAt: now - 2 * D,
      deadline: now + 1 * D,
      estMinutes: 30,
      goalIdx: 1,
      analysis: { goalRelevance: 0.82, impact: 0.7, category: "SOON", reason: "Recruiters open links on their phones — mobile is the first impression.", urgencyHint: 0.1 },
    }),
    mk("Finish deployment documentation", {
      createdAt: now - 3 * D,
      estMinutes: 40,
      goalIdx: 0,
      blocked: true,
      blockNote: "Waiting on staging credentials from the platform team",
      analysis: { goalRelevance: 0.75, impact: 0.6, category: "SOON", reason: "Shows production thinking — interview gold.", urgencyHint: 0 },
    }),
    mk("Learn Kubernetes networking basics", {
      createdAt: now - 4 * D,
      estMinutes: 60,
      goalIdx: 0,
      analysis: { goalRelevance: 0.62, impact: 0.6, category: "SOON", reason: "Compound skill work — come with a full focus block, not spare minutes.", urgencyHint: 0 },
    }),
    mk("Update GitHub profile README", {
      createdAt: now - 1 * D,
      estMinutes: 20,
      goalIdx: 0,
      analysis: { goalRelevance: 0.6, impact: 0.5, category: "SOON", reason: "A sharp profile works for you between applications.", urgencyHint: 0 },
    }),
    mk("Call the bank about the blocked card", {
      createdAt: now - 8 * H,
      deadline: now + 1 * D,
      estMinutes: 15,
      analysis: { goalRelevance: 0.14, impact: 0.4, category: "SOON", reason: "Small admin — clear it before it grows into something bigger.", urgencyHint: 0.3 },
    }),
    mk("Buy groceries", {
      createdAt: now - 3 * H,
      estMinutes: 25,
      analysis: { goalRelevance: 0.08, impact: 0.3, category: "LATER", reason: "Low-stakes errand. Batch it with other small tasks.", urgencyHint: 0 },
    }),
    mk("Send transcript to the applications office", {
      createdAt: now - 2 * D,
      estMinutes: 10,
      status: "delegated",
      analysis: { goalRelevance: 0.3, impact: 0.35, category: "DELEGATE", reason: "Your sibling offered to handle paperwork this week.", urgencyHint: 0 },
    }),
    mk("Redesign personal logo", {
      createdAt: now - 8 * D,
      estMinutes: 90,
      status: "dropped",
      analysis: { goalRelevance: 0.2, impact: 0.2, category: "DROP", reason: "Cosmetic — not what gets you the internship.", urgencyHint: 0 },
    }),
  ];

  return { goals, tasks };
}
