# DM-02: Disaster Mission End-to-End Validation

Authorized 2026-10-30. Work in this existing checkout; preserve unrelated changes.
The user subsequently explicitly deferred the real-model trial as an open gate.
Complete automated acceptance and document that deferral without provider billing.

Goal: demonstrate the existing mission configurator through scoped backend,
database persistence and Valerian, without implementing robot control or roles.

1. Provision isolated loopback MySQL test infrastructure, reusing the existing
   disposable-schema acceptance runner; never use deployment configuration.
2. Add focused scoped integration coverage for success/revision approval, missing
   information and unsafe rejection, including JSON output and detached reload.
3. Demonstrate the same cases through Valerian using deterministic inference and
   the real HTTP/database backend. Keep test-provider helpers test-classpath only.
4. Add a bounded, explicit real-model interpretation trial using configured
   test credentials. Report unavailable configuration separately from passing mocks.
5. Document a repeatable demo, exact evidence, failures and remaining limitations.

Acceptance: reproducible mission capture/clarification/approval/blockade, matching
stored and emitted JSON after reload; passing focused integration/browser checks;
an actual bounded model trial, or an explicit open gate when unavailable.
Do not claim physical safety, authenticated supervisor authority or execution.
