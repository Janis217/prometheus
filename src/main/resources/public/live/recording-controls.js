import { receivedAudioRecording } from "./audio-recording.js";
import { telemetrySnapshot } from "../performance/export.js";

export function mountRecordingControls(root, busy, recording = receivedAudioRecording, snapshot = telemetrySnapshot) {
  if (!root) return () => {};
  const arm = root.querySelector("[data-recording-arm]");
  const stop = root.querySelector("[data-recording-stop]");
  const download = root.querySelector("[data-recording-download]");
  const discard = root.querySelector("[data-recording-discard]");
  const status = root.querySelector("[data-recording-status]");
  const render = () => {
    const state = recording.status, manifest = recording.manifest();
    status.textContent = ({ off: "Off", unsupported: "Recording unavailable in this browser",
      armed: "Armed for the next session only", waiting: "Waiting for received audio", starting: "Starting recording",
      recording: "Recording received audio locally", finalizing: "Finalizing recording", ready: "Audio and telemetry ready to download",
      error: "Recording unavailable or incomplete" })[state];
    if (manifest?.reason) status.textContent += ` (${manifest.reason.replaceAll("_", " ")})`;
    if (manifest?.exportError) status.textContent += " Download failed; retry or discard.";
    arm.disabled = busy() || state !== "off";
    stop.disabled = !["waiting", "starting", "recording"].includes(state);
    download.disabled = state !== "ready";
    discard.disabled = ["off", "unsupported"].includes(state);
  };
  arm.addEventListener("click", () => recording.arm());
  stop.addEventListener("click", () => recording.stop());
  download.addEventListener("click", () => recording.download(snapshot()));
  discard.addEventListener("click", () => recording.discard());
  recording.subscribe(render); render(); return render;
}
