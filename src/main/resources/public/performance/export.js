import { interactionActivity } from "./activity.js";
import { turnTimings } from "./timings.js";
import { timingExport } from "./report.js";
import { liveDiagnostics } from "../live/diagnostics.js";
import { receivedAudioRecording } from "../live/audio-recording.js";

export function telemetrySnapshot() {
  return { ...timingExport(turnTimings.snapshot(), {
    userAgent: navigator.userAgent, timeOrigin: performance.timeOrigin,
  }), live: liveDiagnostics.snapshot(), activity: interactionActivity.snapshot(),
    receivedAudioRecording: receivedAudioRecording.manifest() };
}
