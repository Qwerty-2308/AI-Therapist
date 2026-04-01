-- SereNova Vector Database Schema for Supabase pgvector
-- Run this in your Supabase SQL Editor

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true
);

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);

-- ============================================
-- MESSAGES TABLE (with vector embeddings)
-- ============================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    embedding vector(384),  -- For embedding models like all-MiniLM-L6-v2 (384 dims)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create index for vector similarity search (cosine distance)
CREATE INDEX idx_messages_embedding ON messages 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ============================================
-- USER PREFERENCES TABLE
-- ============================================
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    voice_speed FLOAT DEFAULT 1.0,
    voice_pitch FLOAT DEFAULT 1.0,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    notification_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SESSION HISTORY TABLE
-- ============================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    message_count INTEGER DEFAULT 0,
    sentiment_avg FLOAT,
    topics JSONB DEFAULT '[]'
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update conversation timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_message_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_timestamp_update
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- Function to search similar messages (semantic search)
CREATE OR REPLACE FUNCTION find_similar_messages(
    p_embedding vector(384),
    p_user_id UUID,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    role VARCHAR(20),
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.content,
        m.role,
        1 - (m.embedding <=> p_embedding) AS similarity
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.user_id = p_user_id
    ORDER BY m.embedding <=> p_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get conversation context for AI
CREATE OR REPLACE FUNCTION get_conversation_context(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    role VARCHAR(20),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.role,
        m.content,
        m.created_at
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE c.user_id = p_user_id
    ORDER BY m.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Conversations are private" ON conversations
    FOR ALL USING (
        user_id IN (SELECT id FROM users WHERE auth.uid() = id)
    );

CREATE POLICY "Messages are private" ON messages
    FOR ALL USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE user_id IN (SELECT id FROM users WHERE auth.uid() = id)
        )
    );

-- ============================================
-- EXAMPLE QUERIES
-- ============================================

-- Insert sample user
-- INSERT INTO users (email, display_name) VALUES ('user@example.com', 'John Doe');

-- Insert sample conversation
-- INSERT INTO conversations (user_id, title) 
-- VALUES ('user-uuid-here', 'Therapy Session');

-- Insert message with embedding (use a tool like Supabase Edge Function to generate embeddings)
-- INSERT INTO messages (conversation_id, role, content, embedding)
-- VALUES ('conv-uuid-here', 'user', 'I feel anxious today', '[vector_data]');

-- Search similar past messages
-- SELECT * FROM find_similar_messages(
--     '[new_embedding]',
--     'user-uuid-here',
--   5
-- );
