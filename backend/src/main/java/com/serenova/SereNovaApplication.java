package com.serenova;

import module java.base;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import com.serenova.service.ChatService;
import com.serenova.security.SecurityContext;

@SpringBootApplication
public class SereNovaApplication {
    public static void main(String[] args) {
        SpringApplication.run(SereNovaApplication.class, args);
    }
}

@RestController
@RequestMapping("/api/chat")
class ChatController {
    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    public String chat(@RequestBody String message) throws Exception {
        // Mock user session using Scoped Values (JEP 506)
        var user = new SecurityContext.UserSession(1L, "demo_user");
        
        return ScopedValue.where(SecurityContext.CURRENT_USER, user)
                .call(() -> {
                    // Primitive Patterns check (JEP 507)
                    chatService.handleMetadata(200);
                    chatService.handleMetadata(0.85);
                    
                    return chatService.processChat(message);
                });
    }
}
