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
public class AuthService {

    @Value("${firebase.api-key}")
    private String firebaseApiKey;

    @Value("${firebase.project-id}")
    private String firebaseProjectId;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public AuthService() {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
    }

    public Map<String, Object> verifyFirebaseToken(String idToken) {
        try {
            String url = "https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=" + firebaseApiKey;
            
            var body = Map.of("idToken", idToken);
            String jsonBody = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                Map<String, Object> result = objectMapper.readValue(response.body(), Map.class);
                var users = (java.util.List<Map<String, Object>>) result.get("users");
                if (users != null && !users.isEmpty()) {
                    Map<String, Object> user = users.get(0);
                    return Map.of(
                        "uid", user.get("localId"),
                        "email", user.get("email"),
                        "displayName", user.getOrDefault("displayName", user.get("email"))
                    );
                }
            }
            return null;
        } catch (Exception e) {
            System.err.println("Firebase token verification failed: " + e.getMessage());
            return null;
        }
    }
}
