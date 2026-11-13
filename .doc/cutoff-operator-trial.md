# Received-audio operator trial

Status: NOT RUN. Automated acceptance does not establish physical audibility or
that a missing-word problem is fixed. Use the existing shared Valerian cockpit;
the standalone Valerian repository has not been adapted.

1. With a consenting adult, record the OS/browser, voice, microphone and output
   device. Start with a headset and keep this setup unchanged during the trial.
2. Expand **Received audio inspection**, select **Arm next session**, and start
   one fresh Live session. Keep it below ten minutes and the 32 MiB capture cap.
3. Try an ordinary answer, guessing entry, short yes/no answers, a longer factual
   answer and give-up/reveal. Mark any perceived missing word with **Speech cut
   off**. Note the expected/missing word, caption text and overlapping input or
   lifecycle changes. Let the suspect answer finish before stopping.
4. Stop recording or Live normally, wait for **Audio and telemetry ready to
   download**, then download both files. Keep their matching recording ID. Do
   not commit recordings, transcript extracts or telemetry containing content.
5. Replay after Live stops, preferably on a second output device. Compare the
   marked occurrence using the approximate session/timeline association.
6. If needed, repeat with recording disabled, then vary one factor per trial.

Record each trial separately:

| Field | Observation |
| --- | --- |
| Date, OS, browser/version | Not run |
| Consent confirmed, voice, microphone, output device | Not run |
| Recording ID, session and paired local files | Not run |
| Prompt/task and expected/missing word | Not run |
| Marker time, captions, overlapping input/Stop/departure/errors | Not run |
| Finalization status and coverage/omission warnings | Not run |
| Live listening and replay on original/second device | Not run |
| Outcome and next single-variable trial | Inconclusive until run |

A final word present in the clip but absent during listening points toward the
later playback/output path. An absent word in a complete clip leaves generation,
transport, browser processing and recorder artifacts as candidates. Missing or
incomplete capture makes the trial inconclusive. Captions alone prove neither
audibility nor clipping; correlation alone does not identify a cause.

Full protocol: [Cutoff plan](../.agents/PLAN_CUTOFFINSPECTION.md#operator-trial-and-interpretation).
Software evidence: [results](../.agents/CUTOFF_INSPECTION_RESULTS.md).
