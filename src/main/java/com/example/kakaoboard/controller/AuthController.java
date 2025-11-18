package com.example.kakaoboard.controller;

import com.example.kakaoboard.domain.User;
import com.example.kakaoboard.repository.UserRepository;
import com.example.kakaoboard.service.EmailVerificationService;
import com.example.kakaoboard.service.UserService;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
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
public class AuthController {

    private final UserService userService;
    private final EmailVerificationService verificationService;
    private final UserRepository userRepository;

    /**
     * ✅ 회원가입용 인증번호 발송
     *  POST /api/auth/send-code?email=...
     */
    @PostMapping("/send-code")
    public ResponseEntity<?> sendVerificationCode(@RequestParam String email) {
        try {
            if (userRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body("❌ 이미 가입된 이메일입니다.");
            }

            verificationService.createAndSendCode(email);
            return ResponseEntity.ok("✅ 인증번호가 이메일로 전송되었습니다.");
        } catch (MessagingException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("❌ 메일 전송 실패: " + e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("❌ 서버 오류: " + e.getMessage());
        }
    }

    /**
     * ✅ 회원가입용 인증번호 검증
     * POST /api/auth/verify-code?email=...&code=...
     */
    @PostMapping("/verify-code")
    public ResponseEntity<?> verifyCode(@RequestParam String email,
                                        @RequestParam String code) {
        boolean ok = verificationService.verifyCode(email, code);
        if (ok) return ResponseEntity.ok("✅ 인증 성공");
        return ResponseEntity.badRequest().body("❌ 인증 실패 (번호 불일치 또는 만료)");
    }

    /**
     * ✅ 마이페이지에서 이메일 변경용 인증번호 발송
     * POST /api/auth/send-code-edit?email=...
     */
    @PostMapping("/send-code-edit")
    public ResponseEntity<?> sendVerificationCodeForEdit(@RequestParam String email) {
        try {
            // 이미 다른 유저가 사용중인 이메일인지 체크 (선택)
            if (userRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body("❌ 이미 다른 계정에서 사용 중인 이메일입니다.");
            }

            verificationService.createAndSendCode(email);
            return ResponseEntity.ok("✅ 수정용 인증번호가 이메일로 전송되었습니다.");
        } catch (MessagingException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("❌ 메일 전송 실패: " + e.getMessage());
        }
    }

    /**
     * ✅ 마이페이지 이메일 변경용 코드 검증
     */
    @PostMapping("/verify-code-edit")
    public ResponseEntity<?> verifyCodeForEdit(@RequestParam String email,
                                               @RequestParam String code) {
        boolean ok = verificationService.verifyCode(email, code);
        if (ok) return ResponseEntity.ok("✅ 수정용 이메일 인증 성공");
        return ResponseEntity.badRequest().body("❌ 인증 실패 (번호 불일치 또는 만료)");
    }

    /**
     * ✅ 회원가입
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            if (!verificationService.isVerified(user.getEmail())) {
                return ResponseEntity.badRequest().body("❌ 이메일 인증을 먼저 완료해 주세요.");
            }

            if (userRepository.findByEmail(user.getEmail()).isPresent()) {
                return ResponseEntity.badRequest().body("❌ 이미 가입된 이메일입니다.");
            }

            User saved = userService.register(user);
            verificationService.clear(user.getEmail());

            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("❌ 회원가입 중 오류: " + e.getMessage());
        }
    }

    /**
     * ✅ 로그인
     * POST /api/auth/login  body: { "username": "...", "password": "..." }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        return userService.login(username, password)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(401)
                        .body("아이디 또는 비밀번호가 올바르지 않습니다."));
    }

    /**
     * ✅ 아이디 중복 체크
     */
    @GetMapping("/check-username")
    public ResponseEntity<?> checkUsername(@RequestParam String username) {
        boolean exists = userService.existsByUsername(username);
        if (exists) {
            return ResponseEntity.badRequest().body("❌ 이미 존재하는 아이디입니다.");
        }
        return ResponseEntity.ok("✅ 사용 가능한 아이디입니다.");
    }
}
