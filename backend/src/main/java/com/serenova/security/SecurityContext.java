package com.serenova.security;

public class SecurityContext {
    public static final UserSession CURRENT_USER = new UserSession(1L, "demo_user");
    
    public record UserSession(Long userId, String username) {}
}
