package com.example.kakaoboard.controller;

import com.example.kakaoboard.controller.dto.DeleteAccountRequest;
import com.example.kakaoboard.domain.DeleteAccount;
import com.example.kakaoboard.repository.DeleteAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class DeleteAccountController {

    private final DeleteAccountRepository deleteAccountRepository;

    @PostMapping("/delete-account")
    public ResponseEntity<Void> saveReason(@RequestBody DeleteAccountRequest req) {
        DeleteAccount entity = DeleteAccount.builder()
                .userId(req.getUserId())
                .email(req.getEmail())
                .reason(req.getReason())
                .build();

        deleteAccountRepository.save(entity);
        return ResponseEntity.ok().build();
    }
}
