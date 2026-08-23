import { runAvoidanceTests } from "./src/lib/__tests__/avoidance.test.ts";

console.log("=== RUNNING STAGE 1 TEST SUITE ===");
try {
  runAvoidanceTests();
  console.log("\n>>> ALL STAGE 1 TESTS PASSED SUCCESSFULLY! <<<");
} catch (err) {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
}
