package com.serenova.service;

import com.serenova.dto.SessionResponse;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class SessionService {

    public SessionResponse createSession(String avatarId) {
        String sessionId = UUID.randomUUID().toString();
        System.out.println("Created new session: " + sessionId + " with avatar: " + avatarId);
        return new SessionResponse(sessionId, avatarId);
    }
}
