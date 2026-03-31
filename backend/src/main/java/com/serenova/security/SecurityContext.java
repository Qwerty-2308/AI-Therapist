package com.serenova.security;

import module java.base;

public class SecurityContext {
    public static final ScopedValue<UserSession> CURRENT_USER = ScopedValue.newInstance();
    
    public record UserSession(Long userId, String username) {}
}
