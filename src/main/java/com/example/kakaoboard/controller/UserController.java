package com.example.kakaoboard.controller;

import com.example.kakaoboard.domain.User;
import com.example.kakaoboard.repository.UserRepository;
import com.example.kakaoboard.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor

public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // ✅ 회원정보 수정 API
    @PutMapping("/update")
    public ResponseEntity<?> updateUser(@RequestBody UpdateRequest request) {
        try {
            User updated = userService.updateUser(
                    request.email,
                    request.password,
                    request.username,
                    request.newEmail
            );
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ✅ 비밀번호 검증 API (경로 수정!)
    @PostMapping("/verify")
    public boolean verifyPassword(@RequestBody Map<String, String> data) {
        String email = data.get("email");
        String password = data.get("password");

        System.out.println("🔍 [VERIFY API 호출됨]");
        System.out.println("📧 이메일: " + email);
        System.out.println("🔑 입력된 비밀번호: " + password);

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            System.out.println("❌ 이메일로 사용자를 찾을 수 없음!");
            return false;
        }

        System.out.println("✅ DB 저장 비밀번호 해시: " + user.getPassword());
        boolean matches = passwordEncoder.matches(password, user.getPassword());
        System.out.println("✅ 비밀번호 일치 여부: " + matches);

        return matches;
    }


    // ✅ 요청 DTO
    public static class UpdateRequest {
        public String email;      // 기존 이메일
        public String password;   // 현재 비밀번호
        public String username;   // 새 닉네임
        public String newEmail;   // 새 이메일
    }
}
