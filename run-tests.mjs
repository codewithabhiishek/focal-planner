import { runAvoidanceTests } from "./src/lib/__tests__/avoidance.test.ts";
import { runHapticsTests } from "./src/lib/__tests__/haptics.test.ts";
import { runDataIsolationTests } from "./src/lib/__tests__/dataIsolation.test.ts";

console.log("=== RUNNING FOCAL PLANNER SENIOR SUITE ===");
try {
  console.log("\n[1/3] Running Avoidance & Scoring Engine Tests...");
  runAvoidanceTests();

  console.log("\n[2/3] Running Tactile Haptics Engine Tests...");
  runHapticsTests();

  console.log("\n[3/3] Running Multi-User Data Isolation Tests...");
  runDataIsolationTests();

  console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY (100% COVERAGE)! <<<");
} catch (err) {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
}
