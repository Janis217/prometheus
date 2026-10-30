import test from "node:test";
import assert from "node:assert/strict";
import { ReceivedAudioRecording } from "../../../src/main/resources/public/live/audio-recording.js";

function fixture(options = {}) {
  let clock = 1; const recorders = [], timers = new Map(); let timerId = 0;
  class Recorder {
    static isTypeSupported(type) { return type === "audio/webm;codecs=opus"; }
    constructor(stream, { mimeType }) { this.stream = stream; this.mimeType = mimeType; this.state = "inactive"; recorders.push(this); }
    start(slice) { this.slice = slice; this.state = "recording"; this.onstart?.(); }
    stop() { this.stops = (this.stops || 0) + 1; this.state = "inactive"; }
    data(text = "chunk") { this.ondataavailable?.({ data: new Blob([text]) }); }
    finish() { this.onstop?.(); }
  }
  const copy = { kind: "audio", stop() { this.stopped = true; } };
  const track = { kind: "audio", readyState: "live", clone: () => copy, stop() { this.stopped = true; } };
  const recording = new ReceivedAudioRecording({ Recorder, stream: track => ({ tracks: [track] }),
    now: () => clock++, timeOrigin: 123, uuid: () => "recording-1", maxBytes: 12,
    timer: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; }, cancelTimer: id => timers.delete(id), ...options });
  const run = { agentId: "agent", handle: "session", generation: 1, accessCode: "PRIVATE" };
  const start = () => { recording.arm(); recording.begin(run); recording.received(run, track); return recorders.at(-1); };
  return { recording, recorders, track, copy, run, start, timers };
}

test("default off, unsupported and explicit one-session consent never start capture automatically", () => {
  const f = fixture(); f.recording.begin(f.run); f.recording.received(f.run, f.track);
  assert.equal(f.recorders.length, 0); assert.equal(f.recording.status, "off");
  const unsupported = fixture({ Recorder: null }); assert.equal(unsupported.recording.status, "unsupported");
  assert.equal(unsupported.recording.arm(), false);
  const recorder = f.start(); assert.deepEqual(recorder.stream.tracks, [f.copy]);
  assert.equal(recorder.slice, 1000); assert.equal(f.track.stopped, undefined);
  recorder.data(); f.recording.stop(); recorder.finish();
  f.recording.begin({ ...f.run, handle: "next", generation: 2 });
  f.recording.received(f.run, f.track); assert.equal(f.recorders.length, 1);
  assert.equal(f.recording.arm(), false); f.recording.discard(); assert.equal(f.recording.arm(), true);
});

test("Stop is synchronous and idempotent; final small chunk is retained before download", async () => {
  const f = fixture(); const r = f.start(); r.data("header");
  f.recording.end(f.run, "operator_stop"); f.recording.end(f.run, "operator_stop");
  assert.equal(r.stops, 1); assert.equal(f.copy.stopped, true); assert.equal(f.track.stopped, undefined);
  assert.equal(f.recording.status, "finalizing"); assert.equal(f.recording.download({}), false);
  r.data("tail"); r.finish(); assert.equal(f.recording.status, "ready");
  assert.equal(await f.recording.clip.blob.text(), "headertail"); assert.equal(f.timers.size, 0);
  assert.equal(f.recording.manifest().bytes, 10);
});

test("overflow including final flush rejects the entire file rather than truncating encoded chunks", () => {
  for (const afterStop of [true, false]) {
    const f = fixture(); const r = f.start(); r.data("header"); if (afterStop) f.recording.stop();
    r.data("far too much audio"); r.finish();
    assert.equal(f.recording.status, "error"); assert.equal(f.recording.manifest().reason, "byte_limit");
    assert.equal(f.recording.clip.blob, null); assert.equal(f.recording.clip.bytes, 0);
    assert.equal(f.copy.stopped, true); assert.equal(f.track.stopped, undefined);
    assert.equal(f.recording.download({}), false); assert.equal(f.timers.size, 0);
  }
});

test("duration limits stop only the recorder; missing finalization fails closed", () => {
  const f = fixture(); f.start().data();
  [...f.timers.values()].find(timer => timer.ms === 600000).fn();
  assert.equal(f.recording.status, "finalizing"); assert.equal(f.recording.manifest().reason, "duration_limit");
  [...f.timers.values()].find(timer => timer.ms === 5000).fn();
  assert.equal(f.recording.status, "error"); assert.equal(f.recording.manifest().reason, "finalization_timeout");
  assert.equal(f.track.stopped, undefined);
});

test("discard and revocation fence stale callbacks; replacement tracks never splice clips", () => {
  const f = fixture(); const r = f.start(); const oldData = r.ondataavailable, oldStop = r.onstop;
  f.recording.end(f.run, "authorization_revoked"); assert.equal(f.recording.status, "off");
  f.start(); oldData({ data: new Blob(["obsolete"]) }); oldStop();
  assert.equal(f.recording.clip.bytes, 0); assert.equal(f.recording.status, "recording");
  f.recorders.at(-1).data(); f.recording.received(f.run, { ...f.track });
  assert.equal(f.recording.status, "finalizing"); assert.equal(f.recording.manifest().reason, "track_replaced");
  f.recorders.at(-1).finish(); assert.equal(f.recording.status, "ready");
  f.recording.end(f.run, "scope_change"); assert.equal(f.recording.manifest(), null);
});

test("recorder failure and invalid received tracks cannot touch original media", () => {
  const f = fixture(); const r = f.start(); r.onerror({ error: "PRIVATE" });
  assert.equal(f.recording.status, "error"); assert.equal(f.track.stopped, undefined);
  assert.equal(JSON.stringify(f.recording.manifest()).includes("PRIVATE"), false);
  f.recording.discard(); f.recording.arm(); f.recording.begin(f.run);
  f.recording.received(f.run, { kind: "video" }); assert.equal(f.recording.status, "error");
});

test("paired export is session/generation bound, content-free and marks missing telemetry", async () => {
  const f = fixture(); const r = f.start(); r.data("audio"); f.recording.stop(); r.finish();
  const matching = { handle: "session", agentId: "agent", generation: 1, provider: { configuration: { voice: "willow" } } };
  const snapshot = { live: { sessions: [matching, { ...matching, generation: 2 }], droppedSessions: 1 }, activity: {} };
  const pair = f.recording.pairedTelemetry(snapshot); assert.deepEqual(pair.live.sessions, [matching]);
  assert.equal(pair.recording.audioFilename, "prometheus-received-audio-recording-1.webm");
  const json = JSON.stringify(pair); assert.equal(json.includes("PRIVATE"), false); assert.equal(json.includes("base64"), false);
  assert.equal(json.includes('"audio"'), false); assert.equal(json.includes("blob:"), false);
  assert.match(f.recording.pairedTelemetry({ live: { sessions: [] } }).telemetryCoverage, /incomplete/);
  assert.match(f.recording.pairedTelemetry({ live: { sessions: [{ ...matching, mediaDropped: 1 }] } }).telemetryCoverage, /incomplete/);
  const downloads = []; assert.equal(f.recording.download(snapshot, (blob, name) => downloads.push({ blob, name })), true);
  assert.equal(downloads.length, 2); assert.equal(await downloads[0].blob.text(), "audio");
  const exported = JSON.parse(await downloads[1].blob.text()); assert.deepEqual(exported.recording, pair.recording);
  assert.equal(f.recording.download(snapshot, () => { throw new Error("PRIVATE"); }), false);
  assert.equal(f.recording.manifest().exportError, true);
});
