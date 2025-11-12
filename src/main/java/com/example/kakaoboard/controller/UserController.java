package com.example.kakaoboard.controller;

import com.example.kakaoboard.domain.User;
import com.example.kakaoboard.repository.UserRepository;
import com.example.kakaoboard.service.UserService;
import com.example.kakaoboard.service.EmailService;
import com.example.kakaoboard.service.EmailVerificationService;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")  // ✅ 정확히 이 경로여야 React와 일치
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.0.21:3000"})
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final EmailVerificationService verificationService;
    private final PasswordEncoder passwordEncoder;

    /** ✅ 회원정보 수정 */
    @PutMapping("/update/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody UpdateRequest request) {
        try {
            User updated = userService.updateUser(
                    id,
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

    /** ✅ 비밀번호 검증 */
    @PostMapping("/verify")
    public boolean verifyPassword(@RequestBody Map<String, String> data) {
        String email = data.get("email");
        String password = data.get("password");

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) return false;

        User user = userOpt.get();
        return passwordEncoder.matches(password, user.getPassword());
    }

    /** ✅ 아이디 찾기 */
    @PostMapping("/find-username")
    public ResponseEntity<?> findUsername(@RequestParam String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("❌ 존재하지 않는 이메일입니다.");
        }

        User user = userOpt.get();
        String username = user.getUsername();
        return ResponseEntity.ok("'" + username + "'");
    }

    /** ✅ 이메일 인증번호 전송 (아이디/비밀번호 찾기 공용) */
    @PostMapping("/send-code")
    public ResponseEntity<?> sendResetCode(@RequestParam String email) {
        try {
            // ✅ 존재하는 이메일만 가능
            if (!userRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body("❌ 존재하지 않는 이메일입니다.");
            }

            // ✅ 인증번호 생성 및 메일 전송
            String code = verificationService.createVerificationCode(email);
            emailService.sendVerificationMail(email, code);

            return ResponseEntity.ok("✅ 인증번호가 이메일로 전송되었습니다.");

        } catch (MessagingException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("메일 전송 실패: " + e.getMessage());
        }
    }
    /** ✅ 인증번호 검증 */
    @PostMapping("/verify-code")
    public ResponseEntity<?> verifyResetCode(@RequestParam String email, @RequestParam String code) {
        boolean valid = verificationService.verifyCode(email, code);
        if (valid) {
            return ResponseEntity.ok("✅ 인증 성공");
        }
        return ResponseEntity.badRequest().body("❌ 인증 실패 (번호 불일치 또는 만료)");
    }


    /** ✅ 비밀번호 재설정 */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String newPassword = body.get("newPassword");

        if (!verificationService.isVerified(email)) {
            return ResponseEntity.badRequest().body("이메일 인증을 먼저 완료해주세요!");
        }

        try {
            userService.updatePassword(email, newPassword);
            verificationService.clearVerification(email);
            return ResponseEntity.ok("✅ 비밀번호가 성공적으로 변경되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("비밀번호 변경 중 오류: " + e.getMessage());
        }
    }

    /** ✅ 내부 DTO */
    public static class UpdateRequest {
        public String email;
        public String password;
        public String username;
        public String newEmail;
    }
}
