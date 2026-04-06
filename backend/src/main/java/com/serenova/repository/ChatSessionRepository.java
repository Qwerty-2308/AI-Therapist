package com.serenova.repository;

import com.serenova.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {

    /** Return all sessions for a given user, ordered oldest → newest */
    List<ChatSession> findByUserIdOrderByTimestampAsc(String userId);

    /** Delete all sessions for a given user (clear chat history) */
    void deleteByUserId(String userId);
}
