package com.serenova.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.serenova.dto.SessionResponse;
import com.serenova.service.SessionService;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sessions")
public class SessionController {

    @Autowired
    private SessionService sessionService;

    @PostMapping("/create")
    public ResponseEntity<SessionResponse> createSession(@RequestBody(required = false) Map<String, String> request) {
        System.out.println("Creating session for avatar...");
        
        try {
            String avatarId = request != null ? request.get("avatar_id") : null;
            if (avatarId == null || avatarId.isEmpty()) {
                avatarId = "default";
            }
            
            SessionResponse response = sessionService.createSession(avatarId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error creating session: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(SessionResponse.error("Failed to create session: " + e.getMessage()));
        }
    }

    @GetMapping("/{sessionId}/health")
    public ResponseEntity<String> sessionHealth(@PathVariable String sessionId) {
        return ResponseEntity.ok("OK");
    }
}
