// src/main/java/com/example/kakaoboard/chat/MessageDTO.java
package com.example.kakaoboard.chat;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageDTO {
    private String nickname;
    private String ip;
}
