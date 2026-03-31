package com.serenova.service;

import module java.base;
import java.util.concurrent.*;
import com.serenova.security.SecurityContext;
import org.springframework.stereotype.Service;

@Service
public class ChatService {

    // Structured Concurrency (JEP 505)
    public String processChat(String message) throws ExecutionException, InterruptedException {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            // Fork AI API call
            StructuredTaskScope.Subtask<String> aiResponse = scope.fork(() -> callAiApi(message));
            
            // Fork DB call (e.g., logging)
            StructuredTaskScope.Subtask<Void> dbLog = scope.fork(() -> {
                logToDatabase(message);
                return null;
            });

            scope.join();           // Wait for both
            scope.throwIfFailed();  // Propagate errors

            return aiResponse.get();
        }
    }

    private String callAiApi(String message) {
        // Access Scoped Value (JEP 506)
        var user = SecurityContext.CURRENT_USER.get();
        System.out.println("AI request for user: " + user.username());
        // Dummy response
        return "I understand you're feeling " + message + ". Can you tell me more?";
    }

    private void logToDatabase(String message) {
        // Dummy DB call
        System.out.println("Logging chat history...");
    }

    // Primitive Types in Patterns (JEP 507)
    public void handleMetadata(Object metadata) {
        switch (metadata) {
            case int statusCode when statusCode >= 400 -> 
                System.out.println("Error status code: " + statusCode);
            case int statusCode -> 
                System.out.println("Success status code: " + statusCode);
            case double sentimentScore when sentimentScore < 0.3 -> 
                System.out.println("Low sentiment: " + sentimentScore);
            case double sentimentScore -> 
                System.out.println("Positive sentiment: " + sentimentScore);
            case String msg -> 
                System.out.println("Metadata message: " + msg);
            default -> 
                System.out.println("Unknown metadata type");
        }
    }
}
