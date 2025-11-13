// src/main/java/com/example/kakaoboard/chat/ChatService.java
package com.example.kakaoboard.chat;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final SimpMessagingTemplate messagingTemplate;

    // sessionId -> { nickname, ip }
    private final Map<String, MessageDTO> users = new ConcurrentHashMap<>();

    public void addUser(String sessionId, String nickname, String ip) {
        users.put(sessionId, new MessageDTO(nickname, ip));
        broadcastUsers();
    }

    public void removeUser(String sessionId) {
        users.remove(sessionId);
        broadcastUsers();
    }

    public Map<String, MessageDTO> getUsers() {
        return users;
    }

    public void broadcastChat(ChatMessage message) {
        messagingTemplate.convertAndSend("/topic/public", message);
    }

    public void broadcastUsers() {
        // 프론트에서 Object.values() 할 수 있게 Map 그대로 전송
        messagingTemplate.convertAndSend("/topic/users", users);
    }
}
