package com.serenova.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * ChatService - Core service for AI chat functionality
 * 
 * This service handles communication with NVIDIA's Llama 4 Maverick AI model
 * to provide therapeutic conversation responses. It acts as the bridge between
 * the frontend chat interface and the NVIDIA API.
 * 
 * Key responsibilities:
 * - Process user messages and generate AI responses
 * - Manage conversation context via system prompts
 * - Handle API errors gracefully with fallback responses
 * - Configure AI behavior (temperature, max tokens)
 * 
 * Configuration:
 * - API URL: https://integrate.api.nvidia.com/v1/chat/completions
 * - Model: meta/llama-4-maverick-17b-128e-instruct
 * - API Key: Loaded from NVIDIA_API_KEY environment variable
 * 
 * @author SereNova Team
 * @version 1.0
 */
@Service
public class ChatService {

    /** NVIDIA API endpoint for chat completions */
    private static final String NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
    
    /** Model identifier for Llama 4 Maverick */
    private static final String MODEL_NAME = "meta/llama-4-maverick-17b-128e-instruct";
    
    /** API key - loaded from environment with fallback to empty string */
    private static final String NVIDIA_API_KEY = System.getenv().getOrDefault("NVIDIA_API_KEY", "");
    
    /** HTTP client for API communication */
    private final HttpClient httpClient;
    
    /** JSON serialization/deserialization */
    private final ObjectMapper objectMapper;

    /**
     * Constructor - initializes HTTP client and JSON mapper
     */
    public ChatService() {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
        System.out.println("ChatService initialized with NVIDIA Llama 4 Maverick");
    }

    /**
     * Process incoming chat message and return AI response.
     * 
     * This is the main entry point for chat functionality. It takes a user message,
     * sends it to the NVIDIA Llama model, and returns the generated response.
     * 
     * @param message The user's input message
     * @return AI-generated therapeutic response
     */
    public String processChat(String message) {
        return callLlama(message);
    }

    /**
     * Call NVIDIA Llama 4 API and generate response.
     * 
     * Constructs a request with system prompt (therapy guidelines) and user message,
     * then sends to NVIDIA API for processing. Handles response extraction and error cases.
     * 
     * @param message The user's input message
     * @return AI-generated response or fallback message on error
     */
    private String callLlama(String message) {
        System.out.println("Calling NVIDIA Llama 4 Maverick with message: " + message);

        try {
            // Build message array with system prompt and user input
            var messages = List.of(
                Map.of("role", "system", "content", buildSystemPrompt()),
                Map.of("role", "user", "content", message)
            );

            // Configure API request parameters
            var requestBody = Map.of(
                "model", MODEL_NAME,
                "messages", messages,
                "temperature", 0.7,       // Balanced creativity vs consistency
                "max_tokens", 500,          // Limit response length
                "stream", false             // Single response, not streaming
            );

            // Serialize request body to JSON
            String jsonBody = objectMapper.writeValueAsString(requestBody);

            // Build and send HTTP request to NVIDIA API
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(NVIDIA_API_URL))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + NVIDIA_API_KEY)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .timeout(java.time.Duration.ofSeconds(60))  // 60 second timeout
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            // Process successful response
            if (response.statusCode() == 200) {
                Map<String, Object> result = objectMapper.readValue(response.body(), Map.class);
                return extractResponse(result);
            } else {
                // Log API error and return fallback
                System.err.println("NVIDIA API error: " + response.statusCode() + " - " + response.body());
                return getFallbackResponse(message);
            }
        } catch (Exception e) {
            // Log exception and return fallback response
            System.err.println("Error calling NVIDIA API: " + e.getMessage());
            return getFallbackResponse(message);
        }
    }

    /**
     * Extract the AI response from NVIDIA API response structure.
     * 
     * The API returns a JSON object with a "choices" array containing message objects.
     * This method navigates that structure to extract the content string.
     * 
     * @param result Parsed JSON response from NVIDIA API
     * @return Extracted message content or fallback response
     */
    private String extractResponse(Map<String, Object> result) {
        try {
            // Navigate: result -> choices[0] -> message -> content
            var choices = (List<Map<String, Object>>) result.get("choices");
            if (choices != null && !choices.isEmpty()) {
                var message = (Map<String, Object>) choices.get(0).get("message");
                if (message != null) {
                    return message.get("content").toString();
                }
            }
            return getFallbackResponse("");
        } catch (Exception e) {
            System.err.println("Error extracting response: " + e.getMessage());
            return getFallbackResponse("");
        }
    }

    /**
     * Build the system prompt that defines AI behavior and guidelines.
     * 
     * This prompt establishes the AI as a compassionate therapist, setting boundaries
     * around medical advice, response length, and communication style.
     * 
     * @return System prompt string for AI configuration
     */
    private String buildSystemPrompt() {
        return "You are SereNova, a compassionate AI therapist.\n\n" +
               "Guidelines:\n" +
               "- Respond with empathy, warmth, and active listening\n" +
               "- Keep responses brief (2-3 sentences maximum)\n" +
               "- Never provide medical advice - always recommend consulting a professional for serious concerns\n" +
               "- Use gentle, supportive language\n" +
               "- Validate the user's feelings before offering suggestions\n" +
               "- If the user expresses serious mental health concerns, gently encourage them to seek professional help\n\n" +
               "Remember: You are a supportive AI companion, not a replacement for professional mental health care.";
    }

    /**
     * Generate fallback response when API is unavailable.
     * 
     * Provides a consistent, supportive response when the NVIDIA API fails,
     * ensuring the user always receives a caring response.
     * 
     * @param message The original user message (for context if needed)
     * @return Fallback therapeutic response
     */
    private String getFallbackResponse(String message) {
        return "I'm here for you. Would you like to tell me more about what you're feeling?";
    }
}