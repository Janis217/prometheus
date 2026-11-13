# QA-01: Whole-tool offline regression and recovery coverage

Status: complete (2026-11-13), offline automated scope.

- [x] Inventory units, backend integration and browser suites; isolate destructive cleanup.
- [x] Add recovery tests for authorization, connection, safety and failed saves.
- [x] Update obsolete inline-room journey and home/cockpit resource contracts.
- [x] Provide a single JavaScript unit command and documented isolated runner.
- [x] Pass full Java suite in its generated schema with standard authentication.
- [x] Pass main-app browser suites against fixture apps with Live on/off.
- [x] Confirm password-free local-demo supervisor behavior separately.
- [x] Record counts, failures/fixes, exclusions and reproducible commands.

Main-app scope includes Valerian, Rooms, mission setup/player, API Workbench,
Talk to Me, speech/transcription, Live lifecycle and the backend controllers,
persistence and runtime. Physical hardware, paid providers and the independent
PHP site are separate verification domains.

Continuation state, active runs and remaining checks: [QA01_RESULTS.md](QA01_RESULTS.md).
