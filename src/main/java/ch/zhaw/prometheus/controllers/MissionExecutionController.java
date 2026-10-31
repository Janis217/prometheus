package ch.zhaw.prometheus.controllers;

import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import ch.zhaw.prometheus.application.MissionExecutionService;

/** Simulation-only endpoints. No physical execution route is provided. */
@RestController
@RequestMapping(value = "/demo/agents/{id}/mission-execution", produces = MediaType.APPLICATION_JSON_VALUE)
public class MissionExecutionController {
    private final MissionExecutionService service;
    public MissionExecutionController(MissionExecutionService service) { this.service = service; }
    @GetMapping public String read(@PathVariable UUID id,
            @RequestHeader(value = ScopedDemoController.ACCESS_CODE_HEADER, required = false) String code) {
        return service.read(id, code);
    }
    @PostMapping public String start(@PathVariable UUID id,
            @RequestHeader(value = ScopedDemoController.ACCESS_CODE_HEADER, required = false) String code,
            @RequestHeader(value = MissionReviewController.SUPERVISOR_HEADER, required = false) String token,
            @RequestBody MissionExecutionService.Start input) {
        return service.start(id, code, token, input);
    }
    @PostMapping("/updates") public String update(@PathVariable UUID id,
            @RequestHeader(value = ScopedDemoController.ACCESS_CODE_HEADER, required = false) String code,
            @RequestBody MissionExecutionService.Update input) {
        return service.update(id, code, input);
    }
}
