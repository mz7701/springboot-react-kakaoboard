package com.example.kakaoboard.service;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 접속 중 유저 목록
     *  key: sessionId
     *  value: { "sessionId": ..., "sender": ..., "ip": ... }
     */
    private final Map<String, Map<String, String>> connectedUsers = new ConcurrentHashMap<>();

    /** 현재 접속자 전체 조회 */
    public Map<String, Map<String, String>> getConnectedUsers() {
        return connectedUsers;
    }

    /** 유저 접속 등록 */
    public void addUser(String sessionId, String sender, String ip) {
        Map<String, String> info = new HashMap<>();
        info.put("sessionId", sessionId);
        info.put("sender", sender);
        info.put("ip", ip);

        connectedUsers.put(sessionId, info);
        broadcastUserList();
    }

    /** 유저 접속 해제 */
    public void removeUser(String sessionId) {
        connectedUsers.remove(sessionId);
        broadcastUserList();
    }

    /** 채팅 메시지 브로드캐스트 (DTO 대신 그냥 Map 사용) */
    public void broadcastChat(Map<String, Object> chatMessage) {
        // ChatController에서 쓰는 것과 같은 destination
        messagingTemplate.convertAndSend("/topic/public", chatMessage);
    }

    /** 접속자 목록 브로드캐스트 */
    public void broadcastUserList() {
        messagingTemplate.convertAndSend("/topic/users", connectedUsers);
    }
}
