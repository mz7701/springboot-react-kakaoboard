package com.example.kakaoboard.controller.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DeleteAccountRequest {
    private Long userId;
    private String email;
    private String reason;
}
