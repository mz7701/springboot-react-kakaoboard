package com.example.kakaoboard.service;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.HashMap;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
@Getter
public class ChatService {

    private final SimpMessagingTemplate messagingTemplate;

    // sessionId -> { sender, ip }
    private final Map<String, Map<String, String>> users = new ConcurrentHashMap<>();

    public ChatService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /** 현재 접속자 Map 그대로 반환 (StompDisconnectInterceptor 등에서 사용) */
    public Map<String, Map<String, String>> getUsers() {
        return users;
    }

    /** 접속자 목록 전체를 /topic/users 로 브로드캐스트 */
    public void broadcastUsers() {
        messagingTemplate.convertAndSend("/topic/users", users);
    }

    /** 누군가 입장했을 때 공지 */
    public void broadcastJoin(String sender, String ip) {
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "JOIN");
        msg.put("sender", sender);
        msg.put("ip", ip);
        messagingTemplate.convertAndSend("/topic/public", msg);
    }

    /** 누군가 퇴장했을 때 공지 */
    public void broadcastLeave(String sender) {
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "LEAVE");
        msg.put("sender", sender);
        messagingTemplate.convertAndSend("/topic/public", msg);
    }

    /** 일반 채팅 메시지 브로드캐스트 */
    public void broadcastChat(String sender, String message) {
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "CHAT");
        msg.put("sender", sender);
        msg.put("message", message);
        messagingTemplate.convertAndSend("/topic/public", msg);
    }
}
