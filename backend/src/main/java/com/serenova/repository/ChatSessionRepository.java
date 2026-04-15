package com.serenova.repository;

import com.serenova.entity.ChatSession;
import com.serenova.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {
    List<ChatSession> findByUserOrderByStartedAtDesc(User user);
}
