package com.serenova.controller;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.serenova.dto.LoginRequest;
import com.serenova.dto.SignupRequest;
import com.serenova.dto.VerifyRequest;
import com.serenova.entity.User;
import com.serenova.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "${app.frontend.origin}")
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyToken(@RequestBody VerifyRequest request) {
        try {
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(request.idToken());
            String uid = decodedToken.getUid();
            String email = decodedToken.getEmail();
            String name = (String) decodedToken.getClaims().get("name");
            if (name == null || name.isEmpty()) {
                name = email.split("@")[0];
            }

            // Sync with local DB if needed
            Optional<User> userOpt = userRepository.findByEmail(email);
            User user;
            if (userOpt.isEmpty()) {
                user = new User(name, email, "FIREBASE_AUTH");
                userRepository.save(user);
            } else {
                user = userOpt.get();
            }

            return ResponseEntity.ok(Map.of(
                "message", "Verification successful",
                "username", user.getUsername(),
                "email", user.getEmail(),
                "firebaseUid", uid
            ));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid Firebase token: " + e.getMessage()));
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        try {
            User newUser = new User(request.username(), request.email(), request.password());
            userRepository.save(newUser);
            return ResponseEntity.ok(Map.of("message", "Signup successful", "username", newUser.getUsername()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        var userOpt = request.identifier().contains("@") 
            ? userRepository.findByEmail(request.identifier())
            : userRepository.findByUsername(request.identifier());

        if (userOpt.isPresent() && userOpt.get().getPassword().equals(request.password())) {
            return ResponseEntity.ok(Map.of(
                "message", "Login successful", 
                "username", userOpt.get().getUsername(),
                "userId", userOpt.get().getId()
            ));
        }

        return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
    }
}
