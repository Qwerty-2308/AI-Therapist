package com.serenova.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class ChatService {

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    private static final String GEMINI_API_KEY = System.getenv().getOrDefault("GEMINI_API_KEY", "");
    
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public ChatService() {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
        System.out.println("ChatService initialized with Gemini API");
    }

    public String processChat(String message) {
        return callGemini(message);
    }

    private String callGemini(String message) {
        System.out.println("Calling Gemini API with message: " + message);

        try {
            var requestBody = Map.of(
                    "contents", List.of(Map.of(
                            "parts", List.of(Map.of("text", buildPrompt(message)))
                    )),
                    "generationConfig", Map.of(
                            "temperature", 0.9,
                            "maxOutputTokens", 500,
                            "topP", 0.95,
                            "topK", 40
                    )
            );

            String jsonBody = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(GEMINI_API_URL + "?key=" + GEMINI_API_KEY))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .timeout(java.time.Duration.ofSeconds(60))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                Map<String, Object> result = objectMapper.readValue(response.body(), Map.class);
                return extractResponse(result);
            } else {
                System.err.println("Gemini API error: " + response.body());
                return getFallbackResponse(message);
            }
        } catch (Exception e) {
            System.err.println("Error calling Gemini: " + e.getMessage());
            return getFallbackResponse(message);
        }
    }

    private String extractResponse(Map<String, Object> result) {
        try {
            var candidates = (List<Map<String, Object>>) result.get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                var content = (Map<String, Object>) candidates.get(0).get("content");
                var parts = (List<Map<String, Object>>) content.get("parts");
                if (parts != null && !parts.isEmpty()) {
                    return parts.get(0).get("text").toString();
                }
            }
            return getFallbackResponse("");
        } catch (Exception e) {
            System.err.println("Error extracting response: " + e.getMessage());
            return getFallbackResponse("");
        }
    }

    private String buildPrompt(String message) {
        return "You are SereNova, a compassionate AI therapist. " +
               "Respond with empathy, warmth, and active listening. " +
               "Keep responses brief (2-3 sentences). Never provide medical advice. " +
               "User message: " + message;
    }

    private String getFallbackResponse(String message) {
        return "I'm here for you. Would you like to tell me more about what you're feeling?";
    }
}