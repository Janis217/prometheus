package ch.zhaw.prometheus.controllers;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import ch.zhaw.prometheus.application.MissionReviewService;

@RestController
public class MissionReviewController {
    public static final String SUPERVISOR_HEADER = "X-Prometheus-Supervisor-Token";
    private final MissionReviewService service;
    private final String adminToken;
    public MissionReviewController(MissionReviewService service, @Value("${prometheus.admin.token:}") String adminToken) {
        this.service = service; this.adminToken = adminToken;
    }
    @PostMapping("/admin/disaster/supervisors") @ResponseStatus(HttpStatus.CREATED)
    public MissionReviewService.Credential provision(
            @RequestHeader(value = AdminAccessCodeController.ADMIN_TOKEN_HEADER, required = false) String token,
            @RequestBody MissionReviewService.Provision input) {
        admin(token); return service.provision(input);
    }
    @DeleteMapping("/admin/disaster/supervisors/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable UUID id,
            @RequestHeader(value = AdminAccessCodeController.ADMIN_TOKEN_HEADER, required = false) String token) {
        admin(token); service.revokeCredential(id);
    }
    @GetMapping("/demo/agents/{id}/mission-review")
    public MissionReviewService.Review read(@PathVariable UUID id,
            @RequestHeader(value = ScopedDemoController.ACCESS_CODE_HEADER, required = false) String code) {
        return service.read(id, code);
    }
    @PostMapping("/demo/agents/{id}/mission-review")
    public MissionReviewService.Review decide(@PathVariable UUID id,
            @RequestHeader(value = ScopedDemoController.ACCESS_CODE_HEADER, required = false) String code,
            @RequestHeader(value = SUPERVISOR_HEADER, required = false) String token,
            @RequestBody MissionReviewService.Decision input) {
        return service.decide(id, code, token, input);
    }
    @PutMapping("/demo/agents/{id}/mission-configuration")
    public MissionReviewService.Review configure(@PathVariable UUID id,
            @RequestHeader(value = ScopedDemoController.ACCESS_CODE_HEADER, required = false) String code,
            @RequestBody MissionReviewService.Configuration input) {
        return service.configure(id, code, input);
    }
    private void admin(String token) {
        if (adminToken == null || adminToken.isBlank() || !adminToken.equals(token))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    }
}
