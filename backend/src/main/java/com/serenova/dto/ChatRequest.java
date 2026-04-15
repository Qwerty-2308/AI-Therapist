package com.serenova.dto;

public class ChatRequest {
    private String message;
    private Long sessionId;

    public ChatRequest() {}

    public ChatRequest(String message, Long sessionId) {
        this.message = message;
        this.sessionId = sessionId;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
}
