import { test, expect } from "./fixtures/offline-ui-assets.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";

const type = "core.disaster_mission_configuration";
async function access(request) {
  const headers = { "X-Prometheus-Admin-Token": process.env.PROMETHEUS_ADMIN_TOKEN };
  const code = Math.random().toString(36).slice(2, 7).toUpperCase();
  const issued = await request.post("/admin/access-codes", { headers, data: { code, enabled: true } });
  expect(issued.status()).toBe(201); const scope = await issued.json();
  expect((await request.put(`/admin/access-codes/${scope.id}/agent-types`, { headers, data: { agentTypeKeys: [type] } })).ok()).toBe(true);
  const grant = await request.post("/admin/disaster/supervisors", { headers, data: { scopeId: scope.id, name: "Synthetic fire supervisor" } });
  expect(grant.status()).toBe(201);
  return { code, token: (await grant.json()).token };
}
for (const variant of ["ordinary", "obstacle"]) test(`DM-INT authorized ${variant} fire lifecycle via Valerian simulator adapter`, async ({ page, request }, info) => {
  test.skip(!process.env.PROMETHEUS_ADMIN_TOKEN || !process.env.PROMETHEUS_LIVE_EXPECT_ENABLED, "Use isolated acceptance runner.");
  const credentials = await access(request);
  await page.goto("/valerian/"); await page.getByTestId("access-code-input").fill(credentials.code); await page.getByTestId("submit-access-code").click();
  await page.locator("#open_diagnostics").click(); await page.getByTestId("agent-type-select").selectOption(type);
  const pending = page.waitForResponse(response => response.url().endsWith("/demo/agents") && response.request().method() === "POST");
  await page.getByTestId("create-agent-instance").click(); const agent = await (await pending).json();
  await page.getByTestId("connect-agent").click(); await expect(page.getByTestId("agent-connection-state")).toContainText(`Connected to ${agent.id}`);
  const close = async () => {
    await expect(page.locator("#diagnostics_drawer")).not.toHaveClass(/showing/);
    await page.locator("#diagnostics_drawer").getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.locator("#diagnostics_drawer")).toBeHidden();
  };
  await close();
  const timeline = [];
  const say = async text => {
    const pending = page.waitForResponse(response => response.url().includes(`/demo/agents/${agent.id}/acknowledge`) && response.request().method() === "POST");
    await page.getByTestId("text-input").fill(text); await page.getByTestId("send-text").click();
    const response = await pending; expect(response.ok()).toBe(true);
    const mission = JSON.parse(JSON.parse((await response.json()).responseEvent.payload).speech);
    timeline.push({ action: text, mission }); await expect(page.getByTestId("send-text")).toBeEnabled(); return mission;
  };
  const initial = await say("Start printed-indicator mission in R-204");
  expect(initial.missingInformation).toContain("searchBoundary"); expect(initial.ready).toBe(false);
  await say("Configure printed-indicator mission: inspect only R-204 interior, low urgency, no actual fire, flat terrain; stop on hazards or lost link.");
  await say("Confirm R-204 platform declarations: communications stop, safe standoff, platform suitability, access clearance and terrain suitability confirmed.");
  const configured = await say("Reassess R-204 safety: all declared conditions reviewed; hazards mitigated and platform clearance confirmed.");
  expect(configured.platformSafety.status).toBe("satisfied"); expect(configured.approvalState).toBe("awaiting_supervisor_approval");
  await page.getByText("Mission supervisor review", { exact: true }).click(); await page.getByTestId("mission-review-load").click();
  await expect(page.getByTestId("mission-review-summary")).toContainText("Find printed fire indicator");
  await page.getByTestId("mission-review-token").fill(credentials.token); await page.locator('[data-decision="approve"]').click();
  await expect(page.getByTestId("mission-review-status")).toContainText("Recorded: approve");
  await page.getByTestId("mission-execution-variant").selectOption(variant);
  await page.getByTestId("mission-review-token").fill(credentials.token);
  const summary = page.getByTestId("mission-execution-summary");
  const action = async (name, phase) => {
    const button = page.locator(`[data-execution="${name}"]`); await button.click();
    await expect(button).toBeEnabled(); await expect(summary).toContainText(`"phase": "${phase}"`);
    const state = JSON.parse(await summary.innerText()); timeline.push({ action: name, state });
    expect(state.simulation).toBe(true); expect(state.operationalReady).toBe(false); return state;
  };
  await action("start", "awaiting_acceptance"); await expect(page.getByTestId("mission-review-token")).toHaveValue("");
  await action("step", "coordination"); await action("step", "coordination");
  if (variant === "obstacle") {
    const escalated = await action("step", "escalation"); expect(escalated.pendingDecision).toContain("resume");
    await action("resume", "coordination"); await action("step", "coordination");
  }
  const result = await action("step", "completion_handoff"); expect(result.handoff).toContain("pending");
  const final = await action("handoff", "closed"); expect(final.result.outcome).toBe("completed");
  const headers = { "X-Prometheus-Access-Code": credentials.code };
  const stored = await request.get(`/demo/agents/${agent.id}/mission-execution`, { headers }); expect(stored.ok()).toBe(true); expect(await stored.json()).toEqual(final);
  await page.reload(); await page.locator("#open_diagnostics").click(); await page.getByTestId("agent-select").selectOption(agent.id);
  await page.getByTestId("connect-agent").click(); await expect(page.getByTestId("agent-connection-state")).toContainText(`Connected to ${agent.id}`); await close();
  await page.getByText("Mission supervisor review", { exact: true }).click(); await page.getByTestId("mission-review-load").click();
  await expect(summary).toContainText('"phase": "closed"'); expect(JSON.parse(await summary.innerText())).toEqual(final);
  await info.attach("authorized-simulation-timeline", { body: JSON.stringify(timeline, null, 2), contentType: "application/json" });
  await page.locator("#mission_review_panel").screenshot({ path: info.outputPath("authorized-simulation-handoff.png") });
});

test("DM-05 adapter replay script covers ordinary, obstacle and abort", async ({ request, baseURL }, info) => {
  test.skip(!process.env.PROMETHEUS_ADMIN_TOKEN || !process.env.PROMETHEUS_LIVE_EXPECT_ENABLED, "Use isolated acceptance runner.");
  const credentials = await access(request), headers = { "X-Prometheus-Access-Code": credentials.code };
  for (const variant of ["ordinary", "obstacle", "abort"]) {
    const created = await request.post("/demo/agents", { headers, data: { agentDefinitionKey: type } }); expect(created.status()).toBe(201);
    const agent = await created.json(), path = `/demo/agents/${agent.id}`;
    expect((await request.post(`${path}/acknowledge`, { headers, data: { type: "obs.user_utterance", actor: "operator", kind: "observation", payload: "Configure printed-indicator mission" } })).ok()).toBe(true);
    const reviewed = await request.get(`${path}/mission-review`, { headers }); expect(reviewed.ok()).toBe(true); const review = await reviewed.json();
    expect((await request.post(`${path}/mission-review`, { headers: { ...headers, "X-Prometheus-Supervisor-Token": credentials.token }, data: {
      requestId: crypto.randomUUID(), revision: JSON.parse(review.mission).revision, reviewVersion: review.reviewVersion,
      safetyReference: review.safetyReference, decision: "approve" } })).ok()).toBe(true);
    const output = info.outputPath(`adapter-${variant}.json`);
    const { stdout } = await promisify(execFile)("python", ["tests/disaster/replay_fire_adapter.py", "--base-url", baseURL,
      "--agent-id", agent.id, "--variant", variant, "--output", output], { env: { ...process.env, DM_ACCESS_CODE: credentials.code, DM_SUPERVISOR_TOKEN: credentials.token }, timeout: 60000 });
    expect(stdout).toContain(`PASS: adapter ${variant}`);
    const artifact = JSON.parse(await readFile(output, "utf8")); expect(artifact.timeline.at(-1).state.phase).toBe("closed");
    await info.attach(`adapter-${variant}`, { path: output, contentType: "application/json" });
  }
});
