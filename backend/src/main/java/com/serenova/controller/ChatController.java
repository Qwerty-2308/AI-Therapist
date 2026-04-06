package com.serenova.controller;

import com.serenova.dto.ChatRequest;
import com.serenova.dto.ChatResponse;
import com.serenova.entity.ChatSession;
import com.serenova.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * ChatController — REST endpoints for AI chat.
 *
 *   POST   /api/chat              → send message, get AI response
 *   GET    /api/chat/history      → get chat history for a user
 *   DELETE /api/chat/session      → clear chat history for a user
 */
@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "${app.frontend.origin}")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    /**
     * Main chat endpoint — called by Chat.tsx on every message send.
     *
     * Request body:  { "message": "...", "userId": "..." }
     * Response body: { "response": "...", "sessionId": "...", "timestamp": 123 }
     *
     * userId is optional — falls back to "anonymous" if not provided.
     */
    @PostMapping
    public ResponseEntity<?> chat(@RequestBody ChatRequest request) {
        try {
            if (request.message() == null || request.message().isBlank()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Message cannot be empty"));
            }

            String userId = (request.userId() != null && !request.userId().isBlank())
                ? request.userId()
                : "anonymous";

            String aiText = chatService.processChat(userId, request.message().trim());

            ChatResponse chatResponse = new ChatResponse(
                aiText,
                userId,
                System.currentTimeMillis()
            );

            return ResponseEntity.ok(chatResponse);

        } catch (Exception e) {
            System.err.println("Chat endpoint error: " + e.getMessage());
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Something went wrong. Please try again."));
        }
    }

    /**
     * History endpoint — returns all past messages for a user.
     *
     * Query param: userId (required)
     * Example: GET /api/chat/history?userId=abc123
     */
    @GetMapping("/history")
    public ResponseEntity<?> getHistory(@RequestParam(defaultValue = "anonymous") String userId) {
        try {
            List<ChatSession> sessions = chatService.getHistory(userId);

            // Map to a clean JSON list
            List<Map<String, Object>> result = sessions.stream()
                .map(s -> Map.<String, Object>of(
                    "id",          s.getId(),
                    "userMessage", s.getUserMessage(),
                    "aiResponse",  s.getAiResponse(),
                    "timestamp",   s.getTimestamp().toString()
                ))
                .toList();

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to fetch history"));
        }
    }

    /**
     * Session clear endpoint — deletes all messages for a user.
     *
     * Query param: userId (required)
     * Example: DELETE /api/chat/session?userId=abc123
     */
    @DeleteMapping("/session")
    public ResponseEntity<?> clearSession(@RequestParam(defaultValue = "anonymous") String userId) {
        try {
            chatService.clearSession(userId);
            return ResponseEntity.ok(Map.of(
                "message", "Session cleared successfully",
                "userId",  userId
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to clear session"));
        }
    }

    /**
     * Health check — useful to verify the chat service is running.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "service", "SereNova Chat API"));
    }
}
