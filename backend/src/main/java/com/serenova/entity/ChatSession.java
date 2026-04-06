package com.serenova.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_sessions")
public class ChatSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String userMessage;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String aiResponse;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    // Default constructor for JPA
    protected ChatSession() {}

    public ChatSession(String userId, String userMessage, String aiResponse) {
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("userId cannot be empty");
        }
        this.userId      = userId;
        this.userMessage = userMessage;
        this.aiResponse  = aiResponse;
        this.timestamp   = LocalDateTime.now();
    }

    // Getters
    public Long getId()            { return id; }
    public String getUserId()      { return userId; }
    public String getUserMessage() { return userMessage; }
    public String getAiResponse()  { return aiResponse; }
    public LocalDateTime getTimestamp() { return timestamp; }
}
