import { scoreTask, rankTasks, pickNext, WEIGHTS } from "../engine.ts";
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

  // CASE 2: Blocked high-priority task does not win Focus Card
  const blockedHighPriority: Task = {
    ...freshTask,
    id: "t_blocked",
    blocked: true,
    blockNote: "Waiting on feedback",
  };
  const executableLowPriority: Task = {
    id: "t_low",
    title: "Buy notebooks",
    status: "active",
    deadline: null,
    estMinutes: 10,
    blocked: false,
    postponeCount: 0,
    createdAt: now,
    timeStarved: false,
    deadlineAuto: false,
    analysis: {
      goalId: null,
      goalRelevance: 0,
      impact: 0.2,
      category: "LATER",
      reason: "Stationery.",
      urgencyHint: 0,
      source: "heuristic",
      analyzedAt: now,
      estimatedMinutes: 10,
    },
  };

  const rankedCase2 = rankTasks([blockedHighPriority, executableLowPriority], mockGoals, "any", now);
  const nextCase2 = pickNext(rankedCase2, "any");
  assertEqual(nextCase2?.task.id, "t_low", "CASE 2: Blocked high-priority task is not picked for Focus Card; executable task is chosen");

  // CASE 3: Low-value task due in 1 hour vs high-value strategic task due in 20 days
  const urgentLowValue: Task = {
    id: "t_urgent",
    title: "Return library book",
    status: "active",
    deadline: now + 3600 * 1000, // in 1 hour
    estMinutes: 10,
    blocked: false,
    postponeCount: 0,
    createdAt: now,
    timeStarved: false,
    deadlineAuto: false,
    analysis: {
      goalId: null,
      goalRelevance: 0,
      impact: 0.2,
      category: "SOON",
      reason: "Urgent return.",
      urgencyHint: 1,
      source: "ai",
      analyzedAt: now,
      estimatedMinutes: 10,
    },
  };
  const strategicDistantTask: Task = {
    id: "t_strat",
    title: "Complete IELTS Masterclass",
    status: "active",
    deadline: now + 20 * 86400 * 1000, // in 20 days
    estMinutes: 60,
    blocked: false,
    postponeCount: 0,
    createdAt: now - 86400 * 1000,
    timeStarved: false,
    deadlineAuto: false,
    analysis: {
      goalId: "g1",
      goalRelevance: 1.0,
      impact: 1.0,
      category: "DO_NOW",
      reason: "Core goal achievement.",
      urgencyHint: 0,
      source: "ai",
      analyzedAt: now,
      estimatedMinutes: 60,
    },
  };

  const rUrgent = scoreTask(urgentLowValue, mockGoals, "any", now);
  const rStrat = scoreTask(strategicDistantTask, mockGoals, "any", now);
  assertTrue(rStrat.strategicValue > rUrgent.strategicValue, "CASE 3: Strategic task preserves higher strategicValue (55 vs 4)");
  assertTrue(rStrat.score > 0, "CASE 3: Strategic task remains active and visible with high score");

  // CASE 5: New low-value task vs old high-value task (Reduce recency bias)
  const oldHighValueTask: Task = {
    id: "t_old_high",
    title: "Master German B1 Irregular Verbs",
    status: "active",
    deadline: null,
    estMinutes: 30,
    blocked: false,
    postponeCount: 0,
    createdAt: now - 30 * 86400 * 1000, // 30 days old
    timeStarved: false,
    deadlineAuto: false,
    analysis: {
      goalId: "g2",
      goalRelevance: 0.9,
      impact: 0.8,
      category: "DO_NOW",
      reason: "High strategic leverage.",
      urgencyHint: 0,
      source: "ai",
      analyzedAt: now - 30 * 86400 * 1000,
      estimatedMinutes: 30,
    },
  };
  const newLowValueTask: Task = {
    id: "t_new_low",
    title: "Clean desk surface",
    status: "active",
    deadline: null,
    estMinutes: 5,
    blocked: false,
    postponeCount: 0,
    createdAt: now, // brand new
    timeStarved: false,
    deadlineAuto: false,
    analysis: {
      goalId: null,
      goalRelevance: 0,
      impact: 0.1,
      category: "LATER",
      reason: "Low impact chore.",
      urgencyHint: 0,
      source: "ai",
      analyzedAt: now,
      estimatedMinutes: 5,
    },
  };

  const rOldHigh = scoreTask(oldHighValueTask, mockGoals, "any", now);
  const rNewLow = scoreTask(newLowValueTask, mockGoals, "any", now);
  assertTrue(rOldHigh.score > rNewLow.score, `CASE 5: Old high-value task (${rOldHigh.score}) outranks new low-value task (${rNewLow.score})`);

  // CASE 8: All tasks are blocked
  const allBlockedTasks = [
    { ...freshTask, id: "b1", blocked: true },
    { ...oldHighValueTask, id: "b2", blocked: true },
  ];
  const rankedCase8 = rankTasks(allBlockedTasks, mockGoals, "any", now);
  const nextCase8 = pickNext(rankedCase8, "any");
  assertEqual(nextCase8, null, "CASE 8: pickNext returns null when all tasks are blocked (triggering unblock state)");

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
  assertEqual(rNoGoal.strategicValue, Math.round(0.4 * WEIGHTS.strategicImpact), "CASE 9: Strategic value uses impact score (8 pts)");
  assertTrue(rNoGoal.score > 0, "CASE 9: Overall score is calculated properly without goals");
  assertTrue(rNoGoal.category !== undefined, "CASE 9: Category is assigned");

  // CASE 10: Time budget non-destructive filtering
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
  assertEqual(rAny.parts.time, 10, "CASE 10: Budget 'any' provides neutral +10 time fit");
  assertEqual(rAny.fitsWindow, true, "CASE 10: Budget 'any' sets fitsWindow to true");

  const r15 = scoreTask(taskBudget, mockGoals, 15, now);
  assertEqual(r15.parts.time, 0, "CASE 10: Non-destructive: Task exceeding 15m budget gets 0 time bonus without negative penalty");
  assertEqual(r15.fitsWindow, false, "CASE 10: fitsWindow is false for 20m task in 15m budget");
  assertEqual(r15.strategicValue, rAny.strategicValue, "CASE 10: Intrinsic strategicValue is 100% identical regardless of budget window");
}
