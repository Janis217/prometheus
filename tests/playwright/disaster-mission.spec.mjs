import { test, expect } from "./fixtures/offline-ui-assets.mjs";
import { missionText, label } from '../../src/main/resources/public/valerian/mission-presentation.js';

// Real application HTTP, scoped services, SSE and MySQL. Only extraction is a deterministic test provider.
const TYPE = "core.disaster_mission_configuration";
for (const scenario of ["success", "missing", "unsafe"]) {
  test(`DM-02 mission ${scenario} through Valerian and persisted reload`, async ({ page, request }, info) => {
    test.skip(!process.env.PROMETHEUS_ADMIN_TOKEN || !process.env.PROMETHEUS_LIVE_EXPECT_ENABLED, "Use the isolated acceptance runner.");
    const adminHeaders = { "X-Prometheus-Admin-Token": process.env.PROMETHEUS_ADMIN_TOKEN };
    const code = Math.random().toString(36).slice(2, 7).toUpperCase();
    const accessResponse = await request.post("/admin/access-codes", { headers: adminHeaders, data: { code, enabled: true } });
    expect(accessResponse.status()).toBe(201); const access = await accessResponse.json();
    expect((await request.put(`/admin/access-codes/${access.id}/agent-types`, { headers: adminHeaders, data: { agentTypeKeys: [TYPE] } })).ok()).toBe(true);
    await page.goto("/valerian/developer-cockpit.html");
    await page.getByTestId("access-code-input").fill(code); await page.getByTestId("submit-access-code").click();
    await page.locator("#open_diagnostics").click();
    await page.getByTestId("agent-type-select").selectOption(TYPE);
    const creation = page.waitForResponse(response => response.url().endsWith("/demo/agents") && response.request().method() === "POST");
    await page.getByTestId("create-agent-instance").click(); const agent = await (await creation).json();
    const path = `/demo/agents/${agent.id}`, headers = { "X-Prometheus-Access-Code": code };
    await page.getByTestId("connect-agent").click();
    await expect(page.getByTestId("agent-connection-state")).toContainText(`Connected to ${agent.id}`);
    await expect(page.locator("#diagnostics_drawer")).not.toHaveClass(/showing/);
    await page.locator("#diagnostics_drawer").getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.locator("#diagnostics_drawer")).toBeHidden();
    const mission = async () => {
      const response = await request.get(`${path}/storage`, { headers }); expect(response.ok()).toBe(true);
      return JSON.parse((await response.json()).find(entry => entry.key === "disaster_mission").value);
    };
    const say = async text => {
      const acknowledged = page.waitForResponse(response => response.url().includes(`${path}/acknowledge`) && response.request().method() === "POST");
      await page.getByTestId("text-input").fill(text); await page.getByTestId("send-text").click();
      const response = await acknowledged; expect(response.ok()).toBe(true);
      const outcome = await response.json();
      const emitted = JSON.parse(JSON.parse(outcome.responseEvent.payload).speech);
      await expect(page.getByTestId("send-text")).toBeEnabled();
      expect(await mission()).toEqual(emitted);
      return emitted;
    };
    const brief = scenario === "success"
      ? "Inspect hotspots at North Warehouse; smoke mitigated, clear visibility, low wind, fenced north perimeter. Drone suitability and flight clearance confirmed."
      : scenario === "missing" ? "Search for a missing person" : "Enter the burning building without clearance";
    const draft = await say(brief); expect(draft.ready).toBe(false);
    let result = await say(`approve mission ${draft.revision}`);
    expect(result.ready).toBe(false); // Conversation text never establishes supervisor authority.
    if (scenario === "success") {
      const issued = await request.post("/admin/disaster/supervisors", { headers: adminHeaders,
        data: { scopeId: access.id, name: "Synthetic browser supervisor" } });
      expect(issued.status()).toBe(201); const credential = await issued.json();
      await page.getByText("Mission supervisor review", { exact: true }).click();
      await page.getByTestId("mission-review-load").click();
      await expect(page.getByTestId("mission-review-summary")).toContainText("platformSafety");
      await page.getByTestId("mission-review-token").fill(credential.token);
      await page.locator('[data-decision="approve"]').click();
      await expect(page.getByTestId("mission-review-status")).toContainText("Recorded: approve");
      await expect(page.getByTestId("mission-review-token")).toHaveValue("");
      result = await mission();
      expect(result.approvalState).toBe("supervisor_approved");
      expect(JSON.parse(await page.getByTestId("mission-review-summary").textContent())).toEqual(result);
    }
    expect(result.ready).toBe(scenario === "success");
    expect(result.phase).toBe(({ success: "execution_ready", missing: "mission_capture", unsafe: "blocked" })[scenario]);
    if (scenario !== "success") await expect(page.getByTestId("message-list")).toContainText(label(result.approvalState));
    if (scenario === "missing") expect(result.missingInformation).toContain("location");
    if (scenario === "success") {
      expect(result.selectedEmbodiment).toBe("drone"); expect(result.constraints.length).toBeGreaterThan(0);
      await page.locator('[data-column-panel="interaction"]').screenshot({ path: info.outputPath("mission-ready.png") });
      const changed = await say("Move the inspection to South Warehouse");
      expect(changed.ready).toBe(false); expect(changed.safetyAssessment).toBe("unknown");
    }
    const beforeReload = await mission();
    await page.reload();
    await expect(page.getByTestId("cockpit-shell")).toBeVisible();
    // The connected agent ID is retained in the URL, so reload restores it.
    await page.locator("#open_diagnostics").click();
    await page.getByTestId("agent-select").selectOption(agent.id);
    await expect(page.getByTestId("agent-connection-state")).toContainText(`Connected to ${agent.id}`);
    await expect(page.locator("#diagnostics_drawer")).not.toHaveClass(/showing/);
    await page.locator("#diagnostics_drawer").getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.locator("#diagnostics_drawer")).toBeHidden();
    const lastAssistant = page.getByTestId("message-list").locator(".demo-message.assistant .demo-bubble").last();
    await expect(lastAssistant).toBeVisible();
    expect(await lastAssistant.innerText()).toEqual(missionText(beforeReload));
    expect(await mission()).toEqual(beforeReload);
    await info.attach("mission-result", { body: JSON.stringify(beforeReload, null, 2), contentType: "application/json" });
    await page.locator('[data-column-panel="interaction"]').screenshot({ path: info.outputPath(`mission-${scenario}.png`) });
    // Access scope and actual stored JSON are independent of page hydration.
    expect((await request.get(`${path}/storage`, { headers: { "X-Prometheus-Access-Code": "WRONG" } })).ok()).toBe(false);
  });
}
