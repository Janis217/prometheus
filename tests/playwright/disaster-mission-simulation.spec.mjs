import { test, expect } from "./fixtures/offline-ui-assets.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";

// UC-FIRE-01/02: real Valerian/API/MySQL, explicitly simulated execution and confirmation.
for (const challenging of [false, true]) {
  test(`DM-INT simulation ${challenging ? "obstacle" : "ordinary"} and persisted handoff`, async ({ page, request }, info) => {
    test.skip(!process.env.PROMETHEUS_ADMIN_TOKEN || !process.env.PROMETHEUS_LIVE_EXPECT_ENABLED, "Use isolated acceptance runner.");
    const type = "core.disaster_mission_configuration";
    const admin = { "X-Prometheus-Admin-Token": process.env.PROMETHEUS_ADMIN_TOKEN };
    const code = Math.random().toString(36).slice(2, 7).toUpperCase();
    const accessResponse = await request.post("/admin/access-codes", { headers: admin, data: { code, enabled: true } });
    expect(accessResponse.status()).toBe(201);
    const access = await accessResponse.json();
    expect((await request.put(`/admin/access-codes/${access.id}/agent-types`, { headers: admin, data: { agentTypeKeys: [type] } })).ok()).toBe(true);
    await page.goto("/valerian/");
    await page.getByTestId("access-code-input").fill(code); await page.getByTestId("submit-access-code").click();
    await page.locator("#open_diagnostics").click(); await page.getByTestId("agent-type-select").selectOption(type);
    const creation = page.waitForResponse(response => response.url().endsWith("/demo/agents") && response.request().method() === "POST");
    await page.getByTestId("create-agent-instance").click(); const agent = await (await creation).json();
    const path = `/demo/agents/${agent.id}`, headers = { "X-Prometheus-Access-Code": code };
    await page.getByTestId("connect-agent").click();
    await expect(page.getByTestId("agent-connection-state")).toContainText(`Connected to ${agent.id}`);
    const closeDrawer = async () => {
      await expect(page.locator("#diagnostics_drawer")).not.toHaveClass(/showing/);
      await page.locator("#diagnostics_drawer").getByRole("button", { name: "Close", exact: true }).click();
      await expect(page.locator("#diagnostics_drawer")).toBeHidden();
    };
    await closeDrawer();
    const timeline = [];
    let state;
    const say = async input => {
      const pending = page.waitForResponse(response => response.url().includes(`${path}/acknowledge`) && response.request().method() === "POST");
      await page.getByTestId("text-input").fill(input); await page.getByTestId("send-text").click();
      const response = await pending; expect(response.ok()).toBe(true);
      state = JSON.parse(JSON.parse((await response.json()).responseEvent.payload).speech);
      expect(state.simulation).toBe(true); expect(state.operationalReady).toBe(false);
      await expect(page.getByTestId("send-text")).toBeEnabled();
      await expect(page.getByTestId("message-list")).toContainText(state.phase);
      timeline.push({ input, state });
    };
    const command = action => say(`simulate fire ${action} ${state.runId} ${state.revision}`);
    await say("simulate fire begin");
    for (const action of ["configure", "confirm", "start", "progress"]) await command(action);
    if (challenging) {
      await command("obstacle"); expect(state.phase).toBe("escalation");
      await command("complete"); expect(state.lastRejection).toBeTruthy();
      await command("resume"); await command("progress");
    }
    await command("complete"); expect(state.result.responsibility).toContain("pending");
    await command("handoff"); expect(state.phase).toBe("closed");
    const saved = structuredClone(state);
    const response = await request.get(`${path}/storage`, { headers }); expect(response.ok()).toBe(true);
    const entries = await response.json();
    expect(JSON.parse(entries.find(entry => entry.key === "disaster_mission_simulation").value)).toEqual(saved);
    expect(entries.filter(entry => entry.key.startsWith("disaster_mission_simulation.event.")).length).toBe(saved.sequence);
    expect(JSON.parse(entries.find(entry => entry.key === "disaster_mission").value).ready).toBe(false);
    await page.reload(); await expect(page.getByTestId("cockpit-shell")).toBeVisible();
    await page.locator("#open_diagnostics").click(); await page.getByTestId("agent-select").selectOption(agent.id);
    await page.getByTestId("connect-agent").click();
    await expect(page.getByTestId("agent-connection-state")).toContainText(`Connected to ${agent.id}`); await closeDrawer();
    const last = page.getByTestId("message-list").locator(".demo-message.assistant .demo-bubble").last();
    await expect(last).toBeVisible(); expect(JSON.parse(await last.innerText())).toEqual(saved);
    await info.attach("simulation-timeline", { body: JSON.stringify(timeline, null, 2), contentType: "application/json" });
    await info.attach("simulation-storage", { body: JSON.stringify(entries, null, 2), contentType: "application/json" });
    await page.locator('[data-column-panel="interaction"]').screenshot({ path: info.outputPath("simulation-handoff.png") });
  });
}

test("DM-INT replay script ordinary, obstacle and abort via real scoped API", async ({ request, baseURL }, info) => {
  test.skip(!process.env.PROMETHEUS_ADMIN_TOKEN || !process.env.PROMETHEUS_LIVE_EXPECT_ENABLED, "Use isolated acceptance runner.");
  const admin = { "X-Prometheus-Admin-Token": process.env.PROMETHEUS_ADMIN_TOKEN };
  const code = Math.random().toString(36).slice(2, 7).toUpperCase();
  const accessResponse = await request.post("/admin/access-codes", { headers: admin, data: { code, enabled: true } });
  expect(accessResponse.status()).toBe(201);
  const access = await accessResponse.json();
  const type = "core.disaster_mission_configuration";
  expect((await request.put(`/admin/access-codes/${access.id}/agent-types`, { headers: admin, data: { agentTypeKeys: [type] } })).ok()).toBe(true);
  for (const variant of ["ordinary", "obstacle", "abort"]) {
    const created = await request.post("/demo/agents", { headers: { "X-Prometheus-Access-Code": code }, data: { agentDefinitionKey: type } });
    expect(created.status()).toBe(201);
    const agent = await created.json(), output = info.outputPath(`replay-${variant}.json`);
    const { stdout } = await promisify(execFile)("python", ["tests/disaster/replay_fire_simulation.py", "--base-url", baseURL,
      "--agent-id", agent.id, "--variant", variant, "--output", output], { env: { ...process.env, DM_ACCESS_CODE: code }, timeout: 60000 });
    expect(stdout).toContain(`PASS: simulated ${variant}`);
    const artifact = JSON.parse(await readFile(output, "utf8"));
    expect(artifact.simulation).toBe(true);
    expect(artifact.timeline.at(-1).state.result.outcome).toBe(variant === "abort" ? "aborted" : "indicator_found");
    await info.attach(`replay-${variant}`, { path: output, contentType: "application/json" });
  }
});
