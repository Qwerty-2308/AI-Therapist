package com.serenova;

import com.serenova.entity.User;
import com.serenova.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.bind.annotation.*;
import com.serenova.service.ChatService;
import com.serenova.security.SecurityContext;

import java.util.Optional;

@SpringBootApplication
public class SereNovaApplication {
    public static void main(String[] args) {
        SpringApplication.run(SereNovaApplication.class, args);
    }

    @Bean
    public CommandLineRunner bootstrapDemoUser(UserRepository userRepository) {
        return args -> {
            Optional<User> demoUserOpt = userRepository.findByUsername("demo_user");
            if (demoUserOpt.isEmpty()) {
                User demoUser = new User("demo_user", "demo_user@serenova.local", null, null);
                userRepository.save(demoUser);
                System.out.println("Bootstrap: demo_user created successfully.");
            } else {
                System.out.println("Bootstrap: demo_user already exists.");
            }
        };
    }
}

@RestController
@RequestMapping("/api/chat")
class ChatController {
    private final ChatService chatService;
    private final UserRepository userRepository;

    public ChatController(ChatService chatService, UserRepository userRepository) {
        this.chatService = chatService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public com.serenova.dto.ChatResponse chat(@RequestBody com.serenova.dto.ChatRequest request) throws Exception {
        User demoUser = userRepository.findByUsername("demo_user")
                            .orElseThrow(() -> new RuntimeException("demo_user missing"));
        var userSession = new SecurityContext.UserSession(demoUser.getId(), demoUser.getUsername());
        SecurityContext.CURRENT_USER.set(userSession);
        
        try {
            chatService.handleMetadata(200);
            chatService.handleMetadata(0.85);
            
            return chatService.processChat(request);
        } finally {
            SecurityContext.CURRENT_USER.remove();
        }
    }

    @GetMapping("/history")
    public java.util.List<com.serenova.entity.ChatSession> getHistory() {
        User demoUser = userRepository.findByUsername("demo_user")
                            .orElseThrow(() -> new RuntimeException("demo_user missing"));
        var userSession = new SecurityContext.UserSession(demoUser.getId(), demoUser.getUsername());
        SecurityContext.CURRENT_USER.set(userSession);
        
        try {
            return chatService.getChatHistory();
        } finally {
            SecurityContext.CURRENT_USER.remove();
        }
    }
}
