package com.serenova.service;

import com.serenova.dto.ChatRequest;
import com.serenova.dto.ChatResponse;
import com.serenova.entity.ChatMessage;
import com.serenova.entity.ChatSession;
import com.serenova.entity.User;
import com.serenova.repository.ChatMessageRepository;
import com.serenova.repository.ChatSessionRepository;
import com.serenova.repository.UserRepository;
import com.serenova.security.SecurityContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.CompletableFuture;

@Service
public class ChatService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    public ChatService(ChatSessionRepository chatSessionRepository,
                       ChatMessageRepository chatMessageRepository,
                       UserRepository userRepository) {
        this.chatSessionRepository = chatSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
    }

    public ChatResponse processChat(ChatRequest request) throws Exception {
        var userSession = SecurityContext.CURRENT_USER.get();
        if (userSession == null) {
            throw new RuntimeException("Unauthorized");
        }

        User user = userRepository.findById(userSession.getUserId())
            .orElseThrow(() -> new RuntimeException("User not found"));

        ChatSession chatSession;
        if (request.getSessionId() != null) {
            chatSession = chatSessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> new RuntimeException("Chat session not found"));
            if (!chatSession.getUser().getId().equals(user.getId())) {
                throw new RuntimeException("Unauthorized session access");
            }
        } else {
            try {
                chatSession = new ChatSession(user, "New Chat");
                chatSession = chatSessionRepository.save(chatSession);
            } catch (Exception e) {
                System.err.println("Failed to persist ChatSession mapped to User ID " + user.getId() + ": " + e.getMessage());
                throw new RuntimeException("ChatSession relation integrity failure", e);
            }
        }

        final ChatSession finalChatSession = chatSession;
        String userMessage = request.getMessage();

        CompletableFuture<ChatResponse> responseFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return callAiApi(userMessage, user);
            } catch (Exception ex) {
                System.err.println("Hidden AI Exception Surfaced: " + ex.getMessage());
                return "I'm having trouble processing that right now.";
            }
        }).thenApplyAsync(aiResponse -> {
            String sentimentTag = "Neutral";
            if (userMessage.toLowerCase().contains("sad") || userMessage.toLowerCase().contains("depressed")) {
                sentimentTag = "Negative";
            } else if (userMessage.toLowerCase().contains("happy") || userMessage.toLowerCase().contains("good")) {
                sentimentTag = "Positive";
            }
            
            try {
                ChatMessage chatMessage = new ChatMessage(finalChatSession, userMessage, aiResponse, sentimentTag);
                chatMessage = chatMessageRepository.save(chatMessage);
                return new ChatResponse(aiResponse, finalChatSession.getId(), chatMessage.getId(), sentimentTag);
            } catch (Exception dbEx) {
                System.err.println("Safe async DB save exception logging: " + dbEx.getMessage());
                dbEx.printStackTrace();
                throw new java.util.concurrent.CompletionException("Async DB Save Failed", dbEx);
            }
        });

        try {
            return responseFuture.get(15, java.util.concurrent.TimeUnit.SECONDS);
        } catch (java.util.concurrent.TimeoutException te) {
            System.err.println("processChat timed out waiting for async tasks to complete.");
            responseFuture.cancel(true);
            throw new RuntimeException("Request Timeout", te);
        } catch (Exception e) {
            System.err.println("processChat async branch failed: " + e.getMessage());
            throw new RuntimeException("Chat processing encountered an execution failure", e);
        }
    }

    private String callAiApi(String message, User user) {
        System.out.println("AI request for user: " + user.getUsername());
        return "I understand you're feeling a certain way about: " + message + ". Can you tell me more?";
    }

    public java.util.List<ChatSession> getChatHistory() {
        var userSession = SecurityContext.CURRENT_USER.get();
        if (userSession == null) {
            throw new RuntimeException("Unauthorized");
        }

        User user = userRepository.findById(userSession.getUserId())
            .orElseThrow(() -> new RuntimeException("User not found"));

        java.util.List<ChatSession> sessions = chatSessionRepository.findByUserOrderByStartedAtDesc(user);
        for (ChatSession session : sessions) {
            java.util.List<ChatMessage> orderedMessages = chatMessageRepository.findByChatSessionOrderByCreatedAtAsc(session);
            session.setMessages(orderedMessages);
        }
        return sessions;
    }

    public void handleMetadata(Object metadata) {
        switch (metadata) {
            case Integer statusCode when statusCode >= 400 ->
                System.out.println("Error status code: " + statusCode);
            case Integer statusCode ->
                System.out.println("Success status code: " + statusCode);
            case Double sentimentScore when sentimentScore < 0.3 ->
                System.out.println("Low sentiment: " + sentimentScore);
            case Double sentimentScore ->
                System.out.println("Positive sentiment: " + sentimentScore);
            case String msg ->
                System.out.println("Metadata message: " + msg);
            default ->
                System.out.println("Unknown metadata type");
        }
    }
}