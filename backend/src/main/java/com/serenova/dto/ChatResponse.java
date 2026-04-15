package com.serenova.dto;

public class ChatResponse {
    private String response;
    private Long sessionId;
    private Long messageId;
    private String sentimentTag;

    public ChatResponse() {}

    public ChatResponse(String response, Long sessionId, Long messageId, String sentimentTag) {
        this.response = response;
        this.sessionId = sessionId;
        this.messageId = messageId;
        this.sentimentTag = sentimentTag;
    }

    public String getResponse() { return response; }
    public void setResponse(String response) { this.response = response; }

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }

    public Long getMessageId() { return messageId; }
    public void setMessageId(Long messageId) { this.messageId = messageId; }

    public String getSentimentTag() { return sentimentTag; }
    public void setSentimentTag(String sentimentTag) { this.sentimentTag = sentimentTag; }
}
