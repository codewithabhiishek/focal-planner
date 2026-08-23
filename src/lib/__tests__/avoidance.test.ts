import { scoreTask, rankTasks, pickNext, buildReason, WEIGHTS } from "../engine.ts";
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

  // CASE 6: Long-term goal with no immediate deadline receives Trajectory Pressure when behind schedule
  const laggingGoal: Goal = {
    id: "g_ielts",
    title: "Score Band 8 in IELTS",
    startDate: now - 30 * 86400 * 1000, // started 30 days ago
    targetDate: new Date(now + 30 * 86400 * 1000).toISOString(), // due in 30 days (total 60 days duration -> 50% elapsed)
    progress: 0.1, // only 10% done (expected 50% -> 40% gap)
    active: true,
    isPrimary: true,
    createdAt: now - 30 * 86400 * 1000,
  };

  const noDeadlineLaggingGoalTask: Task = {
    id: "t_ielts_practice",
    title: "Complete IELTS Academic Reading Test",
    status: "active",
    deadline: null, // No immediate hard deadline
    estMinutes: 60,
    blocked: false,
    postponeCount: 0,
    createdAt: now,
    timeStarved: false,
    deadlineAuto: false,
    analysis: {
      goalId: "g_ielts",
      goalRelevance: 0.9,
      impact: 0.8,
      category: "DO_NOW",
      reason: "Critical practice for lagging goal.",
      urgencyHint: 0,
      source: "ai",
      analyzedAt: now,
      estimatedMinutes: 60,
    },
  };

  const rBehind = scoreTask(noDeadlineLaggingGoalTask, [laggingGoal], "any", now);
  const reasonBehind = buildReason(rBehind, [laggingGoal], "any");
  assertTrue(rBehind.parts.trajectory > 0, "CASE 6: Task receives positive trajectory pressure when goal is behind schedule");
  assertEqual(rBehind.parts.trajectory, Math.round(0.9 * 0.4 * WEIGHTS.trajectoryPressure), "CASE 6: Trajectory pressure matches formula (0.9 * 0.4 * 12 = 4 pts)");
  assertTrue(reasonBehind.includes("behind schedule"), "CASE 6: Reason mentions that the goal is behind schedule");

  // Trajectory Fallback: Goal without targetDate yields 0 trajectory pressure
  const goalWithoutDate: Goal = {
    id: "g_nodate",
    title: "Improve General Fitness",
    active: true,
    isPrimary: false,
    createdAt: now,
  };
  const taskNoDateGoal: Task = {
    ...noDeadlineLaggingGoalTask,
    analysis: {
      ...noDeadlineLaggingGoalTask.analysis,
      goalId: "g_nodate",
    },
  };
  const rNoDate = scoreTask(taskNoDateGoal, [goalWithoutDate], "any", now);
  assertEqual(rNoDate.parts.trajectory, 0, "Trajectory Fallback: Goal with no targetDate safely defaults to 0 trajectory pressure");

  // Energy / Context Fit tests
  const lowEnergyTask: Task = {
    ...taskBudget,
    id: "t_low_e",
    requiredEnergy: "low",
  };
  const highEnergyTask: Task = {
    ...taskBudget,
    id: "t_high_e",
    requiredEnergy: "high",
  };

  // User is low energy
  const rLowUserLowTask = scoreTask(lowEnergyTask, mockGoals, "any", now, "low");
  assertEqual(rLowUserLowTask.parts.energy, 5, "Energy Fit: Low energy user matching low energy task gets +5 bonus");

  const rLowUserHighTask = scoreTask(highEnergyTask, mockGoals, "any", now, "low");
  assertEqual(rLowUserHighTask.parts.energy, -5, "Energy Fit: Low energy user on high energy task gets -5 adjustment");

  const rNeutralUser = scoreTask(highEnergyTask, mockGoals, "any", now, "any");
  assertEqual(rNeutralUser.parts.energy, 0, "CASE 10: Energy unset / 'any' produces neutral 0 adjustment, backward compatible");
}
