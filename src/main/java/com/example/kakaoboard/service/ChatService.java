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

    /** 現在の接続ユーザーMapをそのまま返却（StompDisconnectInterceptor などで使用） */
    public Map<String, Map<String, String>> getUsers() {
        return users;
    }

    /** 接続者一覧を /topic/users にブロードキャストする */
    public void broadcastUsers() {
        messagingTemplate.convertAndSend("/topic/users", users);
    }

    /** 誰かが入室したときの通知メッセージを送信 */
    public void broadcastJoin(String sender, String ip) {
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "JOIN");
        msg.put("sender", sender);
        msg.put("ip", ip);
        messagingTemplate.convertAndSend("/topic/public", msg);
    }

    /** 誰かが退室したときの通知メッセージを送信 */
    public void broadcastLeave(String sender) {
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "LEAVE");
        msg.put("sender", sender);
        messagingTemplate.convertAndSend("/topic/public", msg);
    }

    /** 通常のチャットメッセージをブロードキャスト */
    public void broadcastChat(String sender, String message) {
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "CHAT");
        msg.put("sender", sender);
        msg.put("message", message);
        messagingTemplate.convertAndSend("/topic/public", msg);
    }
}
