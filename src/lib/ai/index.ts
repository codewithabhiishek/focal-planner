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
 * Provider factory. Connects through the secure backend endpoint /api/groq (with server .env key),
 * or client key if supplied, and automatically falls back to the built-in offline engine on any error.
 */
export function getProvider(settings: Settings): AIProvider {
  const key = settings.aiKey.trim();
  const model = settings.aiModel || "openai/gpt-oss-120b";
  return createGroqProvider(key, model);
}
