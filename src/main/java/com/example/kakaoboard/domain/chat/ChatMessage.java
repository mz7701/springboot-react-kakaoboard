// src/main/java/com/example/kakaoboard/chat/ChatMessage.java
package com.example.kakaoboard.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    public enum MessageType {
        CHAT, JOIN, LEAVE
    }

    private MessageType type;
    private String sender;   // 닉네임
    private String message;  // 채팅 내용
    private String ip;       // 서버에서 채워줄 IP
}
