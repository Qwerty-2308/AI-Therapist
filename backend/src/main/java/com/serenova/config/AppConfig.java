package com.serenova.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AppConfig implements WebMvcConfigurer {

    @Value("${app.frontend.origin}")
    private String frontendOrigin;

    @Value("${firebase.api-key}")
    private String firebaseApiKey;

    @Value("${firebase.project-id}")
    private String firebaseProjectId;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins(frontendOrigin)
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
    }

    public String getFirebaseApiKey() { return firebaseApiKey; }
    public String getFirebaseProjectId() { return firebaseProjectId; }
}
