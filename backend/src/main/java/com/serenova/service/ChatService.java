package com.serenova.service;

import com.serenova.entity.ChatSession;
import com.serenova.repository.ChatSessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * ChatService — orchestrates Gemini API calls and chat session persistence.
 *
 * Gemini REST endpoint used:
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
 */
@Service
public class ChatService {

    private final ChatSessionRepository sessionRepository;
    private final RestTemplate restTemplate;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-2.0-flash}")
    private String geminiModel;

    // System prompt that sets the therapist persona
    private static final String SYSTEM_PROMPT =
        "You are SereNova, a compassionate and empathetic AI therapist. " +
        "Your role is to listen carefully, validate feelings, ask thoughtful follow-up questions, " +
        "and provide emotional support. Never diagnose or prescribe. " +
        "Always encourage professional help when the situation is serious. " +
        "Keep replies warm, concise (2-4 sentences), and conversational.";

    public ChatService(ChatSessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Main entry point: send user message to Gemini, persist exchange, return AI reply.
     *
     * @param userId   identifier for the user (used for session tracking)
     * @param message  the user's message text
     * @return AI therapist response text
     */
    public String processChat(String userId, String message) {
        // Build recent history for context (last 6 exchanges = 12 turns)
        List<ChatSession> history = sessionRepository.findByUserIdOrderByTimestampAsc(userId);
        String aiResponse = callGeminiApi(message, history);

        // Persist this exchange
        ChatSession session = new ChatSession(userId, message, aiResponse);
        sessionRepository.save(session);

        return aiResponse;
    }

    /**
     * Fetch full chat history for a user.
     */
    public List<ChatSession> getHistory(String userId) {
        return sessionRepository.findByUserIdOrderByTimestampAsc(userId);
    }

    /**
     * Delete all chat sessions for a user (start fresh session).
     */
    public void clearSession(String userId) {
        sessionRepository.deleteByUserId(userId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private String callGeminiApi(String userMessage, List<ChatSession> history) {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + geminiModel + ":generateContent?key=" + geminiApiKey;

        // Build the contents array — system prompt + history + new message
        var contents = new java.util.ArrayList<Map<String, Object>>();

        // System instruction as first user turn (Gemini REST v1beta style)
        contents.add(Map.of(
            "role", "user",
            "parts", List.of(Map.of("text", SYSTEM_PROMPT))
        ));
        contents.add(Map.of(
            "role", "model",
            "parts", List.of(Map.of("text", "Understood. I'm SereNova, your compassionate AI therapist. I'm here to listen."))
        ));

        // Include up to last 6 history exchanges for context
        int start = Math.max(0, history.size() - 6);
        for (int i = start; i < history.size(); i++) {
            ChatSession s = history.get(i);
            contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", s.getUserMessage()))
            ));
            contents.add(Map.of(
                "role", "model",
                "parts", List.of(Map.of("text", s.getAiResponse()))
            ));
        }

        // Current user message
        contents.add(Map.of(
            "role", "user",
            "parts", List.of(Map.of("text", userMessage))
        ));

        // Generation config
        Map<String, Object> generationConfig = Map.of(
            "temperature", 0.8,
            "maxOutputTokens", 512
        );

        Map<String, Object> requestBody = Map.of(
            "contents", contents,
            "generationConfig", generationConfig
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            return extractText(response.getBody());
        } catch (Exception e) {
            System.err.println("Gemini API error: " + e.getMessage());
            return "I'm here with you. It sounds like something important is on your mind — " +
                   "would you like to share more about how you're feeling?";
        }
    }

    @SuppressWarnings("unchecked")
    private String extractText(Map<String, Object> body) {
        if (body == null) return fallbackResponse();
        try {
            var candidates = (List<Map<String, Object>>) body.get("candidates");
            if (candidates == null || candidates.isEmpty()) return fallbackResponse();
            var content = (Map<String, Object>) candidates.get(0).get("content");
            var parts   = (List<Map<String, Object>>) content.get("parts");
            if (parts == null || parts.isEmpty()) return fallbackResponse();
            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            return fallbackResponse();
        }
    }

    private String fallbackResponse() {
        return "I'm here for you. Would you like to tell me more about what you're feeling?";
    }
}
