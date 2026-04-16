package com.serenova.security;

public class SecurityContext {
    public static final ThreadLocal<UserSession> CURRENT_USER = new ThreadLocal<>();

    public static class UserSession {
        private final Long userId;
        private final String username;

        public UserSession(Long userId, String username) {
            this.userId = userId;
            this.username = username;
        }

        public Long getUserId() { return userId; }
        public String getUsername() { return username; }
    }
}
