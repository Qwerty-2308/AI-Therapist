package com.serenova;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.serenova.service.ChatService;
import com.serenova.dto.ChatRequest;
import java.util.Map;

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
    public ResponseEntity<Map<String, String>> chat(@RequestBody ChatRequest request) {
        String response = chatService.processChat(request.getMessage());
        return ResponseEntity.ok(Map.of("response", response));
    }
}
