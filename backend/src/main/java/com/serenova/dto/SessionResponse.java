package com.serenova.dto;

public class SessionResponse {
    private String id;
    private String avatarId;
    private String status;
    private String error;
    
    public SessionResponse() {}
    
    public SessionResponse(String id, String avatarId) {
        this.id = id;
        this.avatarId = avatarId;
        this.status = "active";
    }
    
    public static SessionResponse error(String errorMessage) {
        SessionResponse response = new SessionResponse();
        response.setError(errorMessage);
        response.setStatus("error");
        return response;
    }
    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getAvatarId() { return avatarId; }
    public void setAvatarId(String avatarId) { this.avatarId = avatarId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
}
