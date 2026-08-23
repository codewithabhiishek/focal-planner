import type {
  AIProvider,
  AnalyzeInput,
  Category,
  Goal,
  SubtaskSuggestion,
  Task,
  TaskAnalysis,
} from "../../types";
import { analyzeHeuristic, suggestBreakdown } from "./heuristic";

const BACKEND_ENDPOINT = "/api/groq";
const DIRECT_GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const clamp01 = (v: unknown): number => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0.4;
  return Math.min(1, Math.max(0, n));
};

const CATEGORY_MAP: Record<string, Category> = {
  DO_NOW: "DO_NOW",
  SOON: "SOON",
  LATER: "LATER",
  DELEGATE: "DELEGATE",
  DROP: "DROP",
};

/**
 * Groq AI Provider.
 * Calls the secure backend proxy endpoint (/api/groq) where GROQ_API_KEY is stored safely in .env.
 * Falls back to local heuristic if offline.
 */
export function createGroqProvider(apiKey: string, model: string): AIProvider {
  async function chat(system: string, user: string): Promise<unknown> {
    // 1. Try secure backend endpoint first
    try {
      const res = await fetch(BACKEND_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          system,
          user,
          apiKey: apiKey || undefined,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const raw = json.choices?.[0]?.message?.content ?? "{}";
        return JSON.parse(raw);
      }
    } catch {
      // Backend not reached
    }

    // 2. Direct fallback only if user provided a client key
    if (apiKey) {
      const res = await fetch(DIRECT_GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) throw new Error(`Groq error ${res.status}`);
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = json.choices?.[0]?.message?.content ?? "{}";
      return JSON.parse(raw);
    }

    throw new Error("No backend or API key available");
  }

  return {
    id: "groq",
    label: `Groq · ${model}`,

    async analyzeTask(input: AnalyzeInput, goals: Goal[]): Promise<TaskAnalysis> {
      const fallback = analyzeHeuristic(input, goals);
      try {
        const data = (await chat(
          `You are the prioritization engine inside a focus app. Analyze the task against the user's goals. Respond with ONLY a JSON object:
{"goal_relevance": number 0..1, "estimated_impact": number 0..1, "recommended_category": "DO_NOW"|"SOON"|"LATER"|"DELEGATE"|"DROP", "estimated_minutes": number|null, "goal_id": string|null, "reason": string}`,
          `Goals:\n${goals
            .filter((g) => g.active)
            .map((g) => `- id=${g.id} "${g.title}"${g.isPrimary ? " (PRIMARY)" : ""}${g.targetDate ? ` target ${g.targetDate}` : ""}`)
            .join("\n") || "(none)"}

Task: "${input.title}"${input.notes ? `\nContext: ${input.notes}` : ""}${input.deadline ? `\nDeadline: ${new Date(input.deadline).toISOString()}` : ""}${input.estMinutes ? `\nUser estimate: ${input.estMinutes} min` : ""}

Keep "reason" under 20 words, second person, no quotes around goal names.`
        )) as Record<string, unknown>;

        const catRaw = String(data.recommended_category ?? "").toUpperCase();
        return {
          goalRelevance: clamp01(data.goal_relevance),
          impact: clamp01(data.estimated_impact),
          category: CATEGORY_MAP[catRaw] ?? fallback.category,
          reason:
            typeof data.reason === "string" && data.reason.trim()
              ? data.reason.trim().slice(0, 160)
              : fallback.reason,
          goalId:
            typeof data.goal_id === "string" &&
            goals.some((g) => g.id === data.goal_id)
              ? (data.goal_id as string)
              : fallback.goalId,
          estimatedMinutes:
            typeof data.estimated_minutes === "number" && data.estimated_minutes > 0
              ? Math.round(data.estimated_minutes)
              : fallback.estimatedMinutes,
          urgencyHint: fallback.urgencyHint,
          source: "ai",
          analyzedAt: Date.now(),
        };
      } catch {
        return fallback; // structured fallback — the app never breaks
      }
    },

    async breakDown(task: Task, goals: Goal[]): Promise<SubtaskSuggestion[]> {
      const fallback = suggestBreakdown(task.title);
      try {
        const data = (await chat(
          `You help users start tasks they keep avoiding. Break the task into 3 small, concrete, doable steps a person could finish today. Respond with ONLY a JSON object: {"steps": [{"title": string, "minutes": number}]}. Titles start with a verb, under 8 words, first step under 15 minutes.`,
          `Task: "${task.title}"${task.notes ? `\nContext: ${task.notes}` : ""}\nGoals: ${goals
            .filter((g) => g.active)
            .map((g) => g.title)
            .join(", ") || "none"}`
        )) as { steps?: Array<{ title?: unknown; minutes?: unknown }> };

        const steps = Array.isArray(data.steps) ? data.steps : [];
        const parsed: SubtaskSuggestion[] = steps
          .filter((s) => typeof s.title === "string" && s.title.trim())
          .slice(0, 5)
          .map((s) => ({
            title: String(s.title).trim().slice(0, 90),
            minutes:
              typeof s.minutes === "number" && s.minutes > 0 ? Math.round(s.minutes) : null,
          }));
        return parsed.length >= 2 ? parsed : fallback;
      } catch {
        return fallback;
      }
    },
  };
}
