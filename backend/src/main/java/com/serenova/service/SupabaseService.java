package com.serenova.service;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class SupabaseService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-key}")
    private String serviceKey;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public SupabaseService() {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
    }

    public void createUser(String email, String displayName) {
        createUserIfNotExists(email, displayName);
    }

    public void createUserIfNotExists(String email, String displayName) {
        try {
            // Check if user exists first
            HttpRequest checkRequest = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/users?email=eq." + email))
                .header("apikey", serviceKey)
                .header("Authorization", "Bearer " + serviceKey)
                .GET()
                .build();

            HttpResponse<String> checkResponse = httpClient.send(checkRequest, HttpResponse.BodyHandlers.ofString());
            
            if (checkResponse.statusCode() == 200 && checkResponse.body().contains("\"email\":")) {
                System.out.println("User already exists: " + email);
                return;
            }

            var body = Map.of(
                "email", email,
                "display_name", displayName != null ? displayName : email.split("@")[0]
            );

            String jsonBody = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/users"))
                .header("Content-Type", "application/json")
                .header("apikey", serviceKey)
                .header("Authorization", "Bearer " + serviceKey)
                .header("Prefer", "resolution=merge-duplicates")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            System.out.println("User created: " + response.statusCode());
        } catch (Exception e) {
            System.err.println("Error creating user: " + e.getMessage());
        }
    }

    public void saveMessage(String conversationId, String role, String content) {
        try {
            var body = Map.of(
                "conversation_id", conversationId,
                "role", role,
                "content", content
            );

            String jsonBody = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/rest/v1/messages"))
                .header("Content-Type", "application/json")
                .header("apikey", serviceKey)
                .header("Authorization", "Bearer " + serviceKey)
                .header("Prefer", "return=minimal")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            System.out.println("Message saved: " + response.statusCode());
        } catch (Exception e) {
            System.err.println("Error saving message: " + e.getMessage());
        }
    }
}
