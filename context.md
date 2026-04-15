# SereNova AI Therapist - Technical Context

## Project Overview
SereNova is a modern AI-powered therapist platform designed to provide a safe space for users to share their feelings and receive AI-driven support. The project has undergone a stabilization phase, replacing unstable Java preview features with robust, stable enterprise standards while remaining compatible with Java 25.

---

## 🏗️ Architecture

### **Backend (Spring Boot 3.4+)**
The backend is a robust Java-based Spring Boot application that manages authentication, chat processing, and user data persistence via JPA/H2. It is standardized on **Java 25**, favoring stable APIs over incubating preview features wherever possible for production safety.

### **Frontend (React + Vite + TypeScript)** *(Pending Wire-up)*
The frontend is a single-page application (SPA) built with React and TypeScript, providing a responsive and fluid UI. It handles authentication via Firebase and communicates with the backend via rigidly typed REST API endpoints (`ChatRequest` and `ChatResponse`).

### **Authentication & Database Integration**
- **Firebase Auth**: Used as the primary identity verification provider.
- **Spring Data JPA**: Automates relational data mapping.
- **Database Engine**: H2 SQL configured in persistent file mode (`jdbc:h2:file:./data/serenovadb`) with `ddl-auto=update` to safely retain schemas and chat histories across backend restarts.
  - *Migration Readiness*: The physical schema mapping is actively vetted for 1:1 portable PostgreSQL transposition:
      - All primary keys utilize `@GeneratedValue(strategy = GenerationType.IDENTITY)` which natively hooks PostgreSQL's high-efficiency `BIGSERIAL` sequence indexing.
      - Reserved SQL keyword conflicts are bypassed intentionally (`@Table(name = "users")` instead of `user`).
      - High-volume payload fields rely strictly on abstracted standard declarations (`columnDefinition = "TEXT"`) guaranteed to execute equivalently on any major SQL container dialect.
- **Relational Structure (Hybrid Identity Model)**: 
  - `User` entities support a production-safe hybrid approach: 
      - Native accounts utilize standard `password` validation.
      - Federated accounts utilize `firebaseUid` mapped natively, safely defaulting `password` to null.
      - JPA constraints enforce `firebaseUid` uniqueness without blocking organic users.
  - **Schema Integrity Guardrails**: 
      - `User` entity strictly scopes `email` and `username` as `nullable=false`, safely permitting `password` / `firebaseUid` volatility for federated accounts.
      - `ChatSession` restricts orphaned creation via `@JoinColumn(nullable=false)` and actively executes internal bounds (`nullable=false` on `startedAt`, `sessionTitle`).
      - All cascading foreign key mappings invoke `orphanRemoval = true`; if a parent container (`User` -> `ChatSession` -> `ChatMessage`) drops an index array item or wipes itself entirely, the relational database automatically strips all trailing child rows instantly preventing orphaned records and database leakage.

---

## 🧠 Core Algorithms, Concurrency & Functions

### **1. Chat Processing: Asynchronous AI Delivery (`CompletableFuture`)**
- **What**: The system uses `CompletableFuture.supplyAsync()` to decouple the unpredictable AI API call latency from the main web-handling thread.
- **Why**: Replaced the deprecated/incubating `StructuredTaskScope` (JEP 505) with stable concurrency. It ensures the web server does not block all system threads while waiting for third-party semantic AI APIs to respond.
- **How**: 
  - `ChatService.callAiApi(message)` is wrapped inside a `CompletableFuture`.
  - The thread `.join()`s safely.
  - Basic mock logic triggers sentiment evaluation: assigns "Negative" for words like "sad", "Positive" for words like "happy", and logs this metadata seamlessly to the database via JPA.

### **2. Session Propagation: Standardized `ThreadLocal`**
- **What**: Safely propagates authenticated user information down the call stack.
- **Why**: Replaced preview `ScopedValue` with reliable `ThreadLocal` patterns. It's the industry standard for mapping HTTP request scope properties down to service-level components securely without bloating method signatures.
- **How**: 
  - `SecurityContext.CURRENT_USER` stores a `UserSession`.
  - `ChatController` intercepts requests, validates users (currently mocked cleanly during the stabilization phase), assigns the `ThreadLocal`, and invokes the service layer.
  - Automatically cleaned up in a `finally {}` block to prevent thread poisoning and memory leaks.

### **3. Metadata Handling: Primitive Pattern Matching (JEP 507)**
- **What**: Evaluates varied datatypes quickly in switch statements.
- **Why**: Drastically simplifies what used to be a long chain of `if-else` and `instanceof` blocks.
- **How**: 
  - Defined in `ChatService.handleMetadata()` using modern expressions: `case Integer statusCode when statusCode >= 400 -> ...`

### **4. System Controllers & Handlers**
#### **Chat Controller & DTO Contracts** (`ChatController.java` & `/dto`)
- **What**: Data Transfer Objects (`ChatRequest`, `ChatResponse`) enforce strict JSON constraints protecting the internal entities.
- **Why**: Allows seamless handling of optional `sessionId` continuance. If the user passes a known session, `ChatService` loads their history, if empty, it constructs a new logical database conversation thread automatically.

#### **Auth Controller** (`AuthController.java`)
- **What**: Handles user syncing securely via Firebase tokens.
- **Why**: Bridging Firebase credentials directly with relational databases.
- **How**: Decodes token payloads, splits names based on email identifiers, securely associates them by pushing their `uid` into `User.firebaseUid`, allowing nullable password columns for non-organic (OAuth/Firebase) identities natively without breaking legacy code expectations.

---

## 🛠️ File Structure Map (Backend)

- `pom.xml`: Orchestrates Java 25 source/target dependencies while keeping `--enable-preview` for backward capability.
- `src/main/java/com/serenova/SereNovaApplication.java`: Houses the primary execution loop and the `ChatController`.
- `config/FirebaseConfig.java`: Configures Google Application Credentials reliably using `jakarta.annotation.PostConstruct`.
- `controller/AuthController.java`: Exposes token validation and backend syncing logic.
- `service/ChatService.java`: Evaluates inputs, performs asynchronous API calls, computes sentiment, and communicates with all JPA Repositories.
- `dto/`: Enforces strict data models (`ChatRequest.java`, `ChatResponse.java`, etc.).
- `entity/`: Defines database table schemas (`User.java`, `ChatSession.java`, `ChatMessage.java`).
- `repository/`: Automates transactional SQL processes.

---

## 🔄 Data Flow Walkthrough

1. **Local Authentication**: User authenticates via Firebase -> `Auth.tsx` triggers `/api/auth/verify` -> `AuthController` parses token constraints -> Retrieves or creates `User` assigning `firebaseUid`.
2. **Chat Initiation**: App sends `ChatRequest` containing a message string to `/api/chat`.
3. **Session Intercept**: 
   - Backend controller identifies User mapping -> `ChatService` evaluates if `sessionId` exists via `ChatRequest`. 
   - Yes: Query `ChatSessionRepository.findById(sessionId)` and validate user ownership. 
   - No: Instantiates new `ChatSession` mapping to `User` and saves via `ChatSessionRepository.save()`.
4. **AI Generation**: Asynchronous thread computes mock prompt and `callAiApi()`.
5. **Persistence**: New `ChatMessage` records are established referencing the dialogue content and algorithmic sentiment. 
6. **Return**: `ChatResponse` constructed with message IDs, content, and sentiment -> JSON delivered to Frontend to render sequentially.
