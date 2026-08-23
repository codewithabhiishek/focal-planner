import type { AIProvider, Goal, Settings, SubtaskSuggestion, Task, TaskAnalysis, AnalyzeInput } from "../../types";
import { analyzeHeuristic, suggestBreakdown } from "./heuristic";
import { createGroqProvider } from "./groq";

/** The built-in engine: deterministic, offline, always available. */
export const heuristicProvider: AIProvider = {
  id: "heuristic",
  label: "Built-in heuristic engine",
  analyzeTask: async (input: AnalyzeInput, goals: Goal[]): Promise<TaskAnalysis> =>
    analyzeHeuristic(input, goals),
  breakDown: async (task: Task): Promise<SubtaskSuggestion[]> =>
    suggestBreakdown(task.title),
};

/**
 * Provider factory. With a user-supplied key, the LLM provider handles
 * meaning/impact/goal-matching; every hard constraint (deadlines, blocked,
 * postponements, time budget) stays in the deterministic engine.
 */
export function getProvider(settings: Settings): AIProvider {
  const key = settings.aiKey.trim();
  if (key) {
    return createGroqProvider(key, settings.aiModel || "llama-3.3-70b-versatile");
  }
  return heuristicProvider;
}
