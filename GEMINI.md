# GEMINI.md - SereNova AI Therapist

## Project Overview
SereNova is a conversational AI therapy platform designed to provide real-time emotional support. The application aims to offer empathetic and meaningful interactions for users expressing their feelings through text or speech.

## Current Architecture
- **Frontend**: A web-based interface built with HTML5, Vanilla CSS, and JavaScript.
- **Authentication**: Integrated with Firebase Authentication (Client-side).
- **Backend (Proposed)**: Spring Boot 3.4+ application utilizing Java 25 (LTS) features.

## Key Technologies
- **Java 25 (LTS)**: Utilizing advanced features like Structured Concurrency, Scoped Values, and Flexible Constructor Bodies.
- **Spring Boot 3.4+**: The framework for the RESTful API and core business logic.
- **Firebase**: Currently used for user authentication on the frontend.

## Development Conventions
- **Java 25 Standards**: Adhere to modern Java features (JEP 505, 506, 507, 511, 513).
- **Architecture**: Domain-Driven Design (DDD) principles for entities and services.
- **Concurrency**: Use of Virtual Threads and Structured Concurrency for AI API calls.

## Building and Running
- **Frontend**: Open `index.html` in a browser or serve via a local static file server.
- **Backend (TODO)**: 
    ```bash
    ./mvnw spring-boot:run
    ```

## Key Files
- `index.html`: Main landing page.
- `main.js`: Core frontend logic and Firebase initialization.
- `style.css`: UI styling.
- `backend/`: Spring Boot 3.4+ application using Java 25 features.
    - `pom.xml`: Maven configuration with Java 25 and preview enabled.
    - `src/main/java/com/serenova/SereNovaApplication.java`: Main entry point and REST controller.
    - `src/main/java/com/serenova/service/ChatService.java`: Service using Structured Concurrency and Primitive Patterns.
    - `src/main/java/com/serenova/entity/User.java`: Entity with Flexible Constructor Bodies.
    - `DataMigration.java`: Utility script using Implicitly Declared Classes.
