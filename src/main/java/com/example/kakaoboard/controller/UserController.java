package com.example.kakaoboard.controller;

import com.example.kakaoboard.domain.User;
import com.example.kakaoboard.repository.UserRepository;
import com.example.kakaoboard.service.EmailVerificationService;
import com.example.kakaoboard.service.UserService;
import jakarta.mail.MessagingException;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(
        origins = {
                "http://localhost:3000",
                "http://192.168.0.21:3000",
                "https://kakaoboard-frontend.onrender.com"
        },
        allowedHeaders = "*",
        allowCredentials = "true"
)
public class UserController {

    private final UserRepository userRepository;
    private final UserService userService;
    private final EmailVerificationService verificationService;
    private final PasswordEncoder passwordEncoder;

    /** ✅ 현재 유저 정보 조회 (마이페이지 등에서 사용) */
    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        return userRepository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** ✅ 회원 탈퇴 */
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok("✅ 회원 탈퇴가 완료되었습니다.");
    }

    /** ✅ 마이페이지에서 유저 정보 수정 (닉네임/이메일/비밀번호) */
    @PutMapping("/update/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id,
                                        @RequestBody UpdateRequest req) {
        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = opt.get();

        // 닉네임(아이디) 변경
        if (req.username != null && !req.username.isBlank()) {
            user.setUsername(req.username);
        }

        // 이메일 변경 (newEmail + 이메일 인증 완료 조건)
        if (req.newEmail != null && !req.newEmail.isBlank()) {
            if (!verificationService.isVerified(req.newEmail)) {
                return ResponseEntity.badRequest().body("❌ 새 이메일 인증을 먼저 완료해 주세요.");
            }
            if (userRepository.findByEmail(req.newEmail).isPresent()) {
                return ResponseEntity.badRequest().body("❌ 이미 사용 중인 이메일입니다.");
            }
            user.setEmail(req.newEmail);
            verificationService.clear(req.newEmail);
        }

        // 비밀번호 변경
        if (req.password != null && !req.password.isBlank()) {
            user.setPassword(passwordEncoder.encode(req.password));
        }

        userRepository.save(user);
        return ResponseEntity.ok("✅ 회원 정보가 수정되었습니다.");
    }

    /** ✅ 아이디 찾기 (이메일로 아이디 조회) */
    @PostMapping("/find-username")
    public ResponseEntity<?> findUsername(@RequestParam String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("❌ 존재하지 않는 이메일입니다.");
        }

        String username = userOpt.get().getUsername();
        // 프론트에서 그대로 보여줄 수 있게 단순 문자열로 반환
        return ResponseEntity.ok(username);
    }

    /** ✅ 아이디/비밀번호 찾기용 인증번호 발송 */
    @PostMapping("/send-code")
    public ResponseEntity<?> sendResetCode(@RequestParam String email) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("❌ 존재하지 않는 이메일입니다.");
            }

            verificationService.createAndSendCode(email);
            return ResponseEntity.ok("✅ 인증번호가 이메일로 전송되었습니다.");
        } catch (MessagingException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("❌ 메일 전송 실패: " + e.getMessage());
        }
    }

    /** ✅ 아이디/비밀번호 찾기용 코드 검증 */
    @PostMapping("/verify-code")
    public ResponseEntity<?> verifyResetCode(@RequestParam String email,
                                             @RequestParam String code) {
        boolean ok = verificationService.verifyCode(email, code);
        if (ok) return ResponseEntity.ok("✅ 인증 성공");
        return ResponseEntity.badRequest().body("❌ 인증 실패 (번호 불일치 또는 만료)");
    }

    /** ✅ 비밀번호 재설정 */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest req) {
        if (!verificationService.isVerified(req.email)) {
            return ResponseEntity.badRequest().body("❌ 이메일 인증을 먼저 완료해 주세요.");
        }

        Optional<User> userOpt = userRepository.findByEmail(req.email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("❌ 존재하지 않는 이메일입니다.");
        }

        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(req.newPassword));
        userRepository.save(user);

        verificationService.clear(req.email);
        return ResponseEntity.ok("✅ 비밀번호가 재설정되었습니다.");
    }

    /** ✅ (선택) 유저 존재 여부 확인용 */
    @GetMapping("/verify")
    public ResponseEntity<?> verifyUser(@RequestParam Long userId) {
        boolean exists = userRepository.existsById(userId);
        if (exists) return ResponseEntity.ok("✅ 유저 존재");
        return ResponseEntity.badRequest().body("❌ 유저를 찾을 수 없습니다.");
    }

    // ====== 내부 DTO ======

    @Data
    public static class UpdateRequest {
        public String email;
        public String password;
        public String username;
        public String newEmail;
    }

    @Data
    public static class ResetPasswordRequest {
        public String email;
        public String newPassword;
    }
}
