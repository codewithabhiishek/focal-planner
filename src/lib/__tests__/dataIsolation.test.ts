import {
  BASE_STORAGE_KEY,
  ACTIVE_USER_KEY,
  DEFAULT_USER_ID,
  sanitizeUserId,
  getScopedStorageKey,
  migrateLegacyStateIfNeeded,
  hydrateForUser,
  reducer,
  emptyState,
  type Action,
} from "../storage.ts";
import type { AppState, Goal, Task } from "../../types.ts";

export function runDataIsolationTests(): void {
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

  // Setup localStorage mock in Node environment
  const mockStorage = new Map<string, string>();
  const originalLocalStorage = (globalThis as any).localStorage;

  (globalThis as any).localStorage = {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, val: string) => mockStorage.set(key, String(val)),
    removeItem: (key: string) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
  };

  try {
    // 1. Test sanitizeUserId
    assertEqual(sanitizeUserId(null), DEFAULT_USER_ID, "sanitizeUserId(null) defaults to 'default'");
    assertEqual(sanitizeUserId(undefined), DEFAULT_USER_ID, "sanitizeUserId(undefined) defaults to 'default'");
    assertEqual(sanitizeUserId(""), DEFAULT_USER_ID, "sanitizeUserId('') defaults to 'default'");
    assertEqual(sanitizeUserId("  "), DEFAULT_USER_ID, "sanitizeUserId('  ') defaults to 'default'");
    assertEqual(sanitizeUserId("Alice_99"), "alice_99", "sanitizeUserId converts to lowercase");
    assertEqual(sanitizeUserId("user@work space!"), "user_work_space_", "sanitizeUserId strips special characters");

    // 2. Test getScopedStorageKey
    assertEqual(
      getScopedStorageKey("focal.state.v1", "alice"),
      "focal.state.v1:alice",
      "getScopedStorageKey returns scoped namespace"
    );
    assertEqual(
      getScopedStorageKey(BASE_STORAGE_KEY, "Work!"),
      "focal.state.v1:work_",
      "getScopedStorageKey sanitizes user ID"
    );

    // 3. Test legacy state migration
    mockStorage.clear();
    const legacyMockState: Partial<AppState> = {
      budget: 15,
      goals: [{ id: "g-leg", title: "Legacy Goal", active: true, isPrimary: true, createdAt: 1, targetDate: null }],
      tasks: [],
      settings: { ...emptyState.settings, theme: "dark" },
    };
    mockStorage.set(BASE_STORAGE_KEY, JSON.stringify(legacyMockState));

    migrateLegacyStateIfNeeded();
    const migratedRaw = mockStorage.get("focal.state.v1:default");
    assertTrue(migratedRaw !== undefined && migratedRaw !== null, "Legacy state migrated to focal.state.v1:default");
    const parsedMigrated = JSON.parse(migratedRaw!);
    assertEqual(parsedMigrated.goals[0].title, "Legacy Goal", "Migrated data contents match legacy state");

    // 4. Test multi-user isolation
    mockStorage.clear();
    const aliceState = hydrateForUser("alice");
    aliceState.goals = [{ id: "g-alice", title: "Alice's Project", active: true, isPrimary: true, createdAt: 10, targetDate: null }];
    aliceState.tasks = [{
      id: "t-alice",
      title: "Alice's Focus Task",
      status: "active",
      deadline: null,
      estMinutes: 20,
      blocked: false,
      postponeCount: 0,
      decayCount: 0,
      createdAt: 10,
      timeStarved: false,
      deadlineAuto: false,
      analysis: {
        goalId: "g-alice",
        goalRelevance: 1,
        impact: 0.9,
        category: "DO_NOW",
        reason: "Alice goal",
        urgencyHint: 0,
        estimatedMinutes: 20,
        confidence: 1,
        source: "heuristic",
        analyzedAt: 10,
      },
    }];
    mockStorage.set(getScopedStorageKey(BASE_STORAGE_KEY, "alice"), JSON.stringify(aliceState));

    // Hydrate Bob
    const bobState = hydrateForUser("bob");
    bobState.goals = [{ id: "g-bob", title: "Bob's Fitness", active: true, isPrimary: true, createdAt: 20, targetDate: null }];
    bobState.tasks = [];
    mockStorage.set(getScopedStorageKey(BASE_STORAGE_KEY, "bob"), JSON.stringify(bobState));

    // Verify Alice's state is preserved independently
    const rehydratedAlice = hydrateForUser("alice");
    assertEqual(rehydratedAlice.goals.length, 1, "Alice has 1 goal");
    assertEqual(rehydratedAlice.goals[0].title, "Alice's Project", "Alice's goal is preserved");
    assertEqual(rehydratedAlice.tasks.length, 1, "Alice has 1 task");
    assertEqual(rehydratedAlice.tasks[0].title, "Alice's Focus Task", "Alice's task is preserved");

    // Verify Bob's state has no Alice data
    const rehydratedBob = hydrateForUser("bob");
    assertEqual(rehydratedBob.goals.length, 1, "Bob has 1 goal");
    assertEqual(rehydratedBob.goals[0].title, "Bob's Fitness", "Bob's goal is preserved");
    assertEqual(rehydratedBob.tasks.length, 0, "Bob has 0 tasks (no leak from Alice)");

    // 5. Test reducer RESET_STATE
    const resetAction: Action = { type: "RESET_STATE", state: rehydratedAlice };
    const stateAfterReset = reducer(emptyState, resetAction);
    assertEqual(stateAfterReset.goals[0].title, "Alice's Project", "reducer RESET_STATE updates state completely");
  } finally {
    (globalThis as any).localStorage = originalLocalStorage;
  }
}
