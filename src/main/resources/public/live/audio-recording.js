// Optional local content capture. Never opens a microphone or changes playback.
const TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];
const extension = mime => mime.startsWith("audio/webm") ? "webm" : mime.startsWith("audio/ogg") ? "ogg" : mime.startsWith("audio/mp4") ? "m4a" : null;
const reasons = new Set(["operator_stop", "recording_stop", "duration_limit", "byte_limit", "track_replaced",
  "scope_change", "authorization_revoked", "visitor_departure", "presence_stale", "recorder_error", "finalization_timeout"]);

export class ReceivedAudioRecording {
  constructor({ Recorder = globalThis.MediaRecorder, stream = track => new MediaStream([track]),
    now = () => performance.now(), timeOrigin = globalThis.performance?.timeOrigin,
    uuid = () => crypto.randomUUID(), timer = (fn, ms) => setTimeout(fn, ms), cancelTimer = id => clearTimeout(id),
    maxBytes = 32 * 1024 * 1024, maxMs = 10 * 60 * 1000 } = {}) {
    Object.assign(this, { Recorder, stream, now, timeOrigin, uuid, timer, cancelTimer, maxBytes, maxMs });
    this.mime = TYPES.find(type => Recorder?.isTypeSupported?.(type));
    this.armed = false; this.clip = null; this.listeners = new Set();
  }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  changed() { for (const listener of this.listeners) { try { listener(); } catch (_) { /* Diagnostics never interrupt Live. */ } } }
  get status() { return this.clip?.status || (this.armed ? "armed" : this.mime ? "off" : "unsupported"); }
  arm() {
    if (!this.mime || this.clip) return false; // Replacement requires explicit Discard.
    this.armed = true; this.changed(); return true;
  }
  begin(run) {
    if (!this.armed) return;
    this.armed = false;
    this.clip = { run, id: this.uuid(), status: "waiting", chunks: [], bytes: 0, chunkCount: 0,
      droppedChunks: 0, chunkMetadata: [], metadataDropped: 0, reason: null, mimeType: this.mime,
      times: { requested: this.now(), started: null, stopRequested: null, finalData: null, finalized: null } };
    this.changed();
  }
  received(run, track) {
    const clip = this.clip;
    if (!clip || clip.run !== run) return;
    if (clip.source && clip.source !== track) { this.stop("track_replaced"); return; }
    if (clip.status !== "waiting") return;
    try {
      if (!track || track.kind !== "audio" || track.readyState === "ended") throw new Error();
      clip.source = track; clip.track = track.clone();
      const recorder = clip.recorder = new this.Recorder(this.stream(clip.track), { mimeType: this.mime });
      recorder.onstart = () => {
        if (this.clip !== clip || clip.failed) return;
        clip.times.started = this.now(); clip.mimeType = recorder.mimeType;
        if (clip.status === "starting") clip.status = "recording";
        this.changed();
      };
      recorder.ondataavailable = ({ data }) => {
        if (this.clip !== clip || clip.failed || !data?.size) return;
        clip.times.finalData = this.now(); clip.chunkCount++;
        if (clip.bytes + data.size > this.maxBytes) {
          clip.droppedChunks++; this.fail(clip, "byte_limit"); return;
        }
        clip.bytes += data.size; clip.chunks.push(data);
        if (clip.chunkMetadata.length < 128) clip.chunkMetadata.push({ browserMs: this.now(), bytes: data.size });
        else clip.metadataDropped++;
      };
      recorder.onerror = () => { if (this.clip === clip) this.fail(clip, "recorder_error"); };
      recorder.onstop = () => {
        if (this.clip !== clip) return;
        this.release(clip);
        clip.times.finalized = this.now();
        if (!clip.failed) {
          clip.mimeType = recorder.mimeType || clip.mimeType;
          if (!clip.bytes || !extension(clip.mimeType)) { this.fail(clip, "recorder_error"); return; }
          clip.blob = new Blob(clip.chunks, { type: clip.mimeType });
          clip.chunks = []; clip.status = "ready";
          clip.filename = `prometheus-received-audio-${clip.id}.${extension(clip.mimeType)}`;
        }
        this.changed();
      };
      clip.status = "starting"; recorder.start(1000);
      clip.durationTimer = this.timer(() => { if (this.clip === clip) this.stop("duration_limit"); }, this.maxMs);
      this.changed();
    } catch (_) { this.fail(clip, "recorder_error"); }
  }
  stop(reason = "recording_stop") {
    const clip = this.clip;
    if (!clip || ["ready", "error", "finalizing"].includes(clip.status)) return;
    clip.reason = reasons.has(reason) ? reason : "live_stopped";
    clip.times.stopRequested = this.now(); this.cancelTimer(clip.durationTimer);
    if (!clip.recorder) { this.fail(clip, "no_received_audio"); return; }
    clip.status = "finalizing";
    clip.finalTimer = this.timer(() => {
      if (this.clip === clip && clip.status === "finalizing") this.fail(clip, "finalization_timeout");
    }, 5000);
    try { if (clip.recorder.state !== "inactive") clip.recorder.stop(); }
    catch (_) { this.fail(clip, "recorder_error"); }
    // Only the cloned recording track is owned here. Stop never awaits final data.
    clip.track?.stop(); this.changed();
  }
  end(run, reason) {
    if (["scope_change", "authorization_revoked"].includes(reason)) { this.discard(); return; }
    if (this.clip?.run === run) this.stop(reason);
  }
  release(clip) {
    this.cancelTimer(clip.durationTimer); this.cancelTimer(clip.finalTimer);
    clip.track?.stop(); clip.track = null; clip.source = null;
    if (clip.recorder) {
      clip.recorder.onstart = clip.recorder.onstop = clip.recorder.ondataavailable = clip.recorder.onerror = null;
    }
  }
  fail(clip, reason) {
    if (this.clip !== clip) return;
    clip.failed = true; clip.reason = reason; clip.status = "error";
    try { if (clip.recorder?.state !== "inactive") clip.recorder?.stop(); } catch (_) { /* Best effort. */ }
    this.release(clip); clip.chunks = []; clip.blob = null; clip.bytes = 0; this.changed();
  }
  discard() {
    const clip = this.clip; this.clip = null; this.armed = false;
    if (clip) {
      this.release(clip);
      try { if (clip.recorder?.state !== "inactive") clip.recorder?.stop(); } catch (_) { /* Already stopped. */ }
      clip.chunks = []; clip.blob = null;
    }
    this.changed();
  }
  manifest() {
    const clip = this.clip; if (!clip) return null;
    return { version: 1, recordingId: clip.id, sessionHandle: clip.run.handle || null,
      agentId: clip.run.agentId, generation: clip.run.generation, audioFilename: clip.filename || null,
      status: clip.status, reason: clip.reason, exportError: clip.exportError === true, mimeType: clip.mimeType, bytes: clip.bytes,
      limits: { maxBytes: this.maxBytes, maxMs: this.maxMs }, timeOrigin: this.timeOrigin,
      browserMs: { ...clip.times }, chunkCount: clip.chunkCount, droppedChunks: clip.droppedChunks,
      chunks: clip.chunkMetadata.map(value => ({ ...value })), metadataDropped: clip.metadataDropped,
      coverage: clip.status === "ready" ? "received_track_until_stop" : "incomplete",
      timing: "Chunk delivery observations; approximate association with separate provider clocks. Not physical audibility." };
  }
  pairedTelemetry(snapshot) {
    const recording = this.manifest();
    const live = snapshot.live || snapshot;
    const sessions = (live.sessions || []).filter(session => session.handle === recording?.sessionHandle
      && session.agentId === recording?.agentId && session.generation === recording?.generation);
    const incomplete = recording?.status !== "ready" || !sessions.length || sessions.some(session =>
      session.browserDropped > 0 || session.mediaDropped > 0 || session.server?.retainedDropped > 0
      || session.server?.capture?.retainedDropped > 0 || session.server?.context?.retainedDropped > 0);
    return { ...snapshot, recording, live: { sessions, droppedSessions: live.droppedSessions },
      telemetryCoverage: incomplete ? "incomplete_early_export_or_missing_session_history" : "retained_session_snapshot_not_sample_alignment" };
  }
  download(snapshot, save = saveLocalFile) {
    if (this.clip?.status !== "ready") return false;
    try {
      const paired = this.pairedTelemetry(snapshot);
      save(this.clip.blob, this.clip.filename);
      save(new Blob([JSON.stringify(paired, null, 2)], { type: "application/json" }),
        `prometheus-received-audio-${this.clip.id}.json`);
      return true;
    } catch (_) { this.clip.exportError = true; this.changed(); return false; }
  }
}

function saveLocalFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

export const receivedAudioRecording = new ReceivedAudioRecording();
