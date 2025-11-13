package com.example.kakaoboard.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;

    // sessionId -> { sender, ip }
    private final Map<String, Map<String, String>> connectedUsers = new ConcurrentHashMap<>();

    public ChatController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // ✅ 일반 채팅 메시지
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload Map<String, Object> payload) {

        String sender = (String) payload.get("sender");
        String messageText = (String) payload.get("message");

        Map<String, Object> chat = new HashMap<>();
        chat.put("type", "CHAT");
        chat.put("sender", sender);
        chat.put("message", messageText);

        messagingTemplate.convertAndSend("/topic/public", chat);
    }

    // ✅ 새 유저 입장
    @MessageMapping("/chat.newUser")
    public void newUser(@Payload Map<String, Object> payload,
                        SimpMessageHeaderAccessor headerAccessor) {

        String sessionId = headerAccessor.getSessionId();
        Map<String, Object> attrs = headerAccessor.getSessionAttributes();

        String sender = (String) payload.get("sender");

        // HandshakeInterceptor 에서 넣어둔 ip 사용
        String ip = payload.get("ip") instanceof String ? (String) payload.get("ip") : null;
        if ((ip == null || ip.isBlank()) && attrs != null) {
            Object ipAttr = attrs.get("ip");
            if (ipAttr instanceof String) {
                ip = (String) ipAttr;
            }
        }
        if (ip == null) ip = "-";

        // 🎯 같은 닉네임(sender)을 가진 이전 세션들 전부 제거해서 중복 방지
        connectedUsers.entrySet().removeIf(entry -> {
            Map<String, String> info = entry.getValue();
            return sender != null && sender.equals(info.get("sender"));
        });

        // 새 세션 정보 등록
        Map<String, String> info = new HashMap<>();
        info.put("sender", sender);
        info.put("ip", ip);
        connectedUsers.put(sessionId, info);

        // 입장 메시지
        Map<String, Object> join = new HashMap<>();
        join.put("type", "JOIN");
        join.put("sender", sender);
        join.put("ip", ip);

        messagingTemplate.convertAndSend("/topic/public", join);

        // 현재 접속자 목록 (배열 형태) 브로드캐스트
        Collection<Map<String, String>> users = connectedUsers.values();
        messagingTemplate.convertAndSend("/topic/users", users);
    }

    // ✅ 유저 퇴장
    @MessageMapping("/chat.leaveUser")
    public void leaveUser(@Payload Map<String, Object> payload,
                          SimpMessageHeaderAccessor headerAccessor) {

        String sessionId = headerAccessor.getSessionId();

        // 이 세션 제거
        connectedUsers.remove(sessionId);

        String sender = (String) payload.get("sender");

        Map<String, Object> leave = new HashMap<>();
        leave.put("type", "LEAVE");
        leave.put("sender", sender);

        messagingTemplate.convertAndSend("/topic/public", leave);

        // 남은 접속자 목록 다시 브로드캐스트
        Collection<Map<String, String>> users = connectedUsers.values();
        messagingTemplate.convertAndSend("/topic/users", users);
    }
}
