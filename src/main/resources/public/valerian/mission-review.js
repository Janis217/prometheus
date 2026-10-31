// Scoped review controls. Supervisor credentials remain in memory and are cleared after each decision/scope change.
export function mountMissionReview(root, getScope) {
  root.innerHTML = `<details><summary>Mission supervisor review</summary>
    <button type="button" class="btn btn-outline-ink btn-sm mt-2" data-testid="mission-review-load">Load current mission</button>
    <pre data-testid="mission-review-summary" style="white-space:pre-wrap;max-height:16rem;overflow:auto"></pre>
    <label class="form-label">Supervisor credential<input type="password" autocomplete="off" class="form-control" data-testid="mission-review-token"></label>
    <div class="d-flex gap-2"><button type="button" class="btn btn-primary btn-sm" data-decision="approve">Approve</button>
    <button type="button" class="btn btn-outline-ink btn-sm" data-decision="reject">Reject</button>
    <button type="button" class="btn btn-outline-ink btn-sm" data-decision="revoke">Revoke approval</button></div>
    <p role="status" data-testid="mission-review-status"></p>
    <hr><p>Local fire-image simulation only. No robot movement or sensor evidence.</p>
    <label>Simulation variant<select class="form-select" data-testid="mission-execution-variant">
      <option value="ordinary">Ordinary</option><option value="obstacle">Blocked path</option>
      <option value="failure">Executor failure</option><option value="timeout">Timeout fixture</option></select></label>
    <div class="d-flex flex-wrap gap-2 mt-2">
      <button type="button" class="btn btn-primary btn-sm" data-execution="start">Start simulation</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-execution="step">Next simulation update</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-execution="resume">Resume within bounds</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-execution="abort">Abort simulation</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-execution="handoff">Acknowledge handoff</button>
    </div><pre data-testid="mission-execution-summary" style="white-space:pre-wrap;max-height:16rem;overflow:auto"></pre>
    <p data-testid="mission-execution-status" role="status"></p></details>`;
  let snapshot = null, version = 0;
  let execution = null;
  const token = root.querySelector("input"), summary = root.querySelector("pre"), status = root.querySelector('[role="status"]');
  const executionSummary = root.querySelector('[data-testid="mission-execution-summary"]');
  const executionStatus = root.querySelector('[data-testid="mission-execution-status"]');
  const current = () => {
    const scope = getScope();
    if (!scope.agentId || !scope.accessCode) throw new Error("Connect to a mission agent first.");
    return { ...scope, key: `${scope.agentId}:${scope.accessCode}` };
  };
  async function load() {
    const scope = current(), generation = ++version;
    const response = await fetch(`/demo/agents/${encodeURIComponent(scope.agentId)}/mission-review`,
      { headers: { "X-Prometheus-Access-Code": scope.accessCode }, cache: "no-store" });
    if (generation !== version || current().key !== scope.key) return;
    if (!response.ok) { snapshot = null; throw new Error(`Mission unavailable (${response.status}).`); }
    const payload = await response.json();
    if (generation !== version || current().key !== scope.key) return;
    snapshot = { ...payload, scope: scope.key };
    summary.textContent = JSON.stringify(JSON.parse(snapshot.mission), null, 2);
    status.textContent = "Review this revision and its declared safety checks before deciding.";
    const running = await fetch(`/demo/agents/${encodeURIComponent(scope.agentId)}/mission-execution`,
      { headers: { "X-Prometheus-Access-Code": scope.accessCode }, cache: "no-store" });
    if (generation !== version || current().key !== scope.key) return;
    const run = running.ok ? await running.json() : null;
    if (generation !== version || current().key !== scope.key) return;
    execution = run; executionSummary.textContent = run ? JSON.stringify(run, null, 2) : "";
  }
  root.querySelector("button").addEventListener("click", async () => {
    const buttons = root.querySelectorAll("button"); buttons.forEach(item => { item.disabled = true; });
    try { await load(); } catch (error) { status.textContent = error.message; }
    finally { buttons.forEach(item => { item.disabled = false; }); }
  });
  for (const button of root.querySelectorAll("[data-decision]")) button.addEventListener("click", async () => {
    const buttons = root.querySelectorAll("button");
    try {
      const scope = current();
      if (!snapshot || snapshot.scope !== scope.key) throw new Error("Load and review the current mission first.");
      const credential = token.value; token.value = "";
      if (!credential) throw new Error("A supervisor credential is required.");
      buttons.forEach(item => { item.disabled = true; });
      const generation = version;
      const mission = JSON.parse(snapshot.mission);
      const response = await fetch(`/demo/agents/${encodeURIComponent(scope.agentId)}/mission-review`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Prometheus-Access-Code": scope.accessCode,
          "X-Prometheus-Supervisor-Token": credential },
        body: JSON.stringify({ requestId: crypto.randomUUID(), revision: mission.revision,
          reviewVersion: snapshot.reviewVersion, safetyReference: snapshot.safetyReference, decision: button.dataset.decision }),
      });
      if (generation !== version || current().key !== scope.key) return;
      if (!response.ok) { snapshot = null; throw new Error(`Decision rejected (${response.status}); reload before another decision.`); }
      snapshot = { ...await response.json(), scope: scope.key };
      summary.textContent = JSON.stringify(JSON.parse(snapshot.mission), null, 2);
      status.textContent = `Recorded: ${button.dataset.decision}. No robot execution triggered.`;
    } catch (error) { status.textContent = error.message; }
    finally { token.value = ""; buttons.forEach(item => { item.disabled = false; }); }
  });
  for (const button of root.querySelectorAll("[data-execution]")) button.addEventListener("click", async () => {
    const buttons = root.querySelectorAll("button");
    try {
      const scope = current(), generation = version, action = button.dataset.execution;
      if (!snapshot || snapshot.scope !== scope.key) throw new Error("Load the current mission first.");
      let body, path = `/demo/agents/${encodeURIComponent(scope.agentId)}/mission-execution`;
      const headers = { "Content-Type": "application/json", "X-Prometheus-Access-Code": scope.accessCode };
      if (action === "start") {
        if (!token.value) throw new Error("Enter a supervisor credential to start the simulation.");
        headers["X-Prometheus-Supervisor-Token"] = token.value; token.value = "";
        body = { requestId: crypto.randomUUID(), revision: JSON.parse(snapshot.mission).revision,
          reviewVersion: snapshot.reviewVersion, safetyReference: snapshot.safetyReference,
          variant: root.querySelector("select").value };
      } else {
        if (!execution) throw new Error("Start or load a simulation first.");
        path += "/updates"; body = { executionId: execution.executionId, expectedSequence: execution.sequence, action };
      }
      buttons.forEach(item => { item.disabled = true; });
      const response = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(`Simulation update rejected (${response.status}); load current state.`);
      const result = await response.json();
      if (generation !== version || current().key !== scope.key) return;
      execution = result; executionSummary.textContent = JSON.stringify(result, null, 2);
      executionStatus.textContent = `Simulation: ${result.phase}.`;
    } catch (error) { executionStatus.textContent = error.message; }
    finally { token.value = ""; buttons.forEach(item => { item.disabled = false; }); }
  });
  return { clear() { version++; snapshot = null; execution = null; token.value = ""; summary.textContent = "";
    status.textContent = ""; executionSummary.textContent = ""; executionStatus.textContent = ""; } };
}
