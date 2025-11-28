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

    // ✅ 通常チャットメッセージ
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

    // ✅ 新規ユーザー入室
    @MessageMapping("/chat.newUser")
    public void newUser(@Payload Map<String, Object> payload,
                        SimpMessageHeaderAccessor headerAccessor) {

        String sessionId = headerAccessor.getSessionId();
        Map<String, Object> attrs = headerAccessor.getSessionAttributes();

        String sender = (String) payload.get("sender");

        // HandshakeInterceptorで保存しておいたIPを使用
        String ip = payload.get("ip") instanceof String ? (String) payload.get("ip") : null;
        if ((ip == null || ip.isBlank()) && attrs != null) {
            Object ipAttr = attrs.get("ip");
            if (ipAttr instanceof String) {
                ip = (String) ipAttr;
            }
        }
        if (ip == null) ip = "-";

        // 🎯 同じニックネーム(sender)を持つ既存セッションをすべて削除して重複を防ぐ
        connectedUsers.entrySet().removeIf(entry -> {
            Map<String, String> info = entry.getValue();
            return sender != null && sender.equals(info.get("sender"));
        });

        // 新しいセッション情報を登録
        Map<String, String> info = new HashMap<>();
        info.put("sender", sender);
        info.put("ip", ip);
        connectedUsers.put(sessionId, info);

        // 入室メッセージ
        Map<String, Object> join = new HashMap<>();
        join.put("type", "JOIN");
        join.put("sender", sender);
        join.put("ip", ip);

        messagingTemplate.convertAndSend("/topic/public", join);

        // 現在の接続ユーザー一覧（配列）をブロードキャスト
        Collection<Map<String, String>> users = connectedUsers.values();
        messagingTemplate.convertAndSend("/topic/users", users);
    }

    // ✅ ユーザー退室
    @MessageMapping("/chat.leaveUser")
    public void leaveUser(@Payload Map<String, Object> payload,
                          SimpMessageHeaderAccessor headerAccessor) {

        String sessionId = headerAccessor.getSessionId();

        // このセッションを削除
        connectedUsers.remove(sessionId);

        String sender = (String) payload.get("sender");

        Map<String, Object> leave = new HashMap<>();
        leave.put("type", "LEAVE");
        leave.put("sender", sender);

        messagingTemplate.convertAndSend("/topic/public", leave);

        // 残りの接続ユーザー一覧を再度ブロードキャスト
        Collection<Map<String, String>> users = connectedUsers.values();
        messagingTemplate.convertAndSend("/topic/users", users);
    }
}
