import { scoreTask, WEIGHTS } from "../engine.ts";
import type { Goal, Task } from "../../types.ts";

export function runAvoidanceTests(): void {
  function assertEqual<T>(actual: T, expected: T, msg: string): void {
    if (actual !== expected) {
      throw new Error(`FAIL: ${msg} (expected ${expected}, got ${actual})`);
    }
    console.log(`PASS: ${msg}`);
  }

  function assertTrue(actual: boolean, msg: string): void {
    if (!actual) {
      throw new Error(`FAIL: ${msg}`);
    }
    console.log(`PASS: ${msg}`);
  }

  const mockGoals: Goal[] = [
    {
      id: "g1",
      title: "Score Band 8 in IELTS",
      targetDate: "2026-09-30",
      active: true,
      isPrimary: true,
      createdAt: 1000,
    },
    {
      id: "g2",
      title: "Learn German B1",
      targetDate: null,
      active: true,
      isPrimary: false,
      createdAt: 1000,
    },
  ];

  const now = 1000000;

  // CASE 1: Highly important task postponed 3 times
  const freshTask: Task = {
    id: "t1",
    title: "Write IELTS Task 2 Essay",
    status: "active",
    deadline: now + 3600 * 1000,
    estMinutes: 40,
    blocked: false,
    postponeCount: 0,
    decayCount: 0,
    createdAt: now,
    timeStarved: false,
    deadlineAuto: false,
    analysis: {
      goalId: "g1",
      goalRelevance: 0.95,
      impact: 0.9,
      category: "DO_NOW",
      reason: "Directly moves primary goal forward.",
      urgencyHint: 0,
      source: "ai",
      analyzedAt: now,
      estimatedMinutes: 40,
    },
  };

  const r0 = scoreTask(freshTask, mockGoals, "any", now);

  const postponedTask: Task = {
    ...freshTask,
    postponeCount: 3,
    decayCount: 3,
  };

  const r3 = scoreTask(postponedTask, mockGoals, "any", now);

  assertEqual(r3.strategicValue, r0.strategicValue, "CASE 1: strategicValue remains unchanged after 3 postponements (no intrinsic decay)");
  assertEqual(r3.parts.goal, r0.parts.goal, "CASE 1: parts.goal remains identical");
  assertEqual(r3.parts.impact, r0.parts.impact, "CASE 1: parts.impact remains identical");
  assertEqual(r3.frictionScore, 3 * WEIGHTS.postponePenalty, "CASE 1: frictionScore correctly tracks 3 * 7 = 21");
  assertEqual(r0.score - r3.score, 21, "CASE 1: Overall score only dips by the capped postpone penalty of 21 points");

  // CASE 9: No goals exist
  const taskNoGoal: Task = {
    id: "t2",
    title: "Clean apartment workspace",
    status: "active",
    deadline: null,
    estMinutes: 15,
    blocked: false,
    postponeCount: 0,
    createdAt: now,
    timeStarved: false,
    deadlineAuto: false,
    analysis: {
      goalId: null,
      goalRelevance: 0,
      impact: 0.4,
      category: "LATER",
      reason: "Good environment.",
      urgencyHint: 0,
      source: "heuristic",
      analyzedAt: now,
      estimatedMinutes: 15,
    },
  };

  const rNoGoal = scoreTask(taskNoGoal, [], "any", now);

  assertEqual(rNoGoal.parts.goal, 0, "CASE 9: Goal score is 0 when no goals exist");
  assertEqual(rNoGoal.strategicValue, Math.round(0.4 * WEIGHTS.impact), "CASE 9: Strategic value uses impact score (8 pts)");
  assertTrue(rNoGoal.score > 0, "CASE 9: Overall score is calculated properly without goals");
  assertTrue(rNoGoal.category !== undefined, "CASE 9: Category is assigned");

  // CASE 10: Time budget 'any'
  const taskBudget: Task = {
    id: "t3",
    title: "Read German article",
    status: "active",
    deadline: null,
    estMinutes: 20,
    blocked: false,
    postponeCount: 0,
    createdAt: now,
    timeStarved: false,
    deadlineAuto: false,
    analysis: {
      goalId: "g2",
      goalRelevance: 0.8,
      impact: 0.5,
      category: "SOON",
      reason: "Practice.",
      urgencyHint: 0,
      source: "ai",
      analyzedAt: now,
      estimatedMinutes: 20,
    },
  };

  const rAny = scoreTask(taskBudget, mockGoals, "any", now);
  assertEqual(rAny.parts.time, 8, "CASE 10: Budget 'any' provides neutral +8 time fit");
  assertEqual(rAny.fitsWindow, true, "CASE 10: Budget 'any' sets fitsWindow to true");

  const r15 = scoreTask(taskBudget, mockGoals, 15, now);
  assertEqual(r15.parts.time, -45, "CASE 10: Task exceeding 15m budget is penalized -45");
  assertEqual(r15.fitsWindow, false, "CASE 10: fitsWindow is false for 20m task in 15m budget");
}
