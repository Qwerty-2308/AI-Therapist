package com.serenova.controller;

import com.serenova.service.AuthService;
import com.serenova.service.SupabaseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "${app.frontend.origin}")
public class AuthController {

    private final AuthService authService;
    private final SupabaseService supabaseService;

    public AuthController(AuthService authService, SupabaseService supabaseService) {
        this.authService = authService;
        this.supabaseService = supabaseService;
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyToken(@RequestBody Map<String, String> request) {
        String idToken = request.get("idToken");
        
        if (idToken == null || idToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "ID token required"));
        }

        Map<String, Object> userInfo = authService.verifyFirebaseToken(idToken);
        
        if (userInfo == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
        }

        // Create user in Supabase if not exists
        String email = (String) userInfo.get("email");
        String displayName = (String) userInfo.get("displayName");
        supabaseService.createUserIfNotExists(email, displayName);

        return ResponseEntity.ok(Map.of(
            "message", "Authentication successful",
            "uid", userInfo.get("uid"),
            "email", email,
            "displayName", displayName
        ));
    }

    @PostMapping("/create-user")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String displayName = request.getOrDefault("displayName", email.split("@")[0]);
        
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
        }

        supabaseService.createUserIfNotExists(email, displayName);
        return ResponseEntity.ok(Map.of(
            "message", "User created",
            "email", email
        ));
    }
}
