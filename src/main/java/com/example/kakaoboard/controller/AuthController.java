package com.example.kakaoboard.controller;

import com.example.kakaoboard.domain.User;
import com.example.kakaoboard.repository.UserRepository;
import com.example.kakaoboard.service.UserService;
import com.example.kakaoboard.service.EmailVerificationService;
import com.example.kakaoboard.service.EmailService;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = {"", "http://192.168.0.21:3000"})
public class AuthController {

    private final UserService userService;
    private final EmailVerificationService verificationService;
    private final EmailService emailService; // ✅ 이메일 전송 서비스
    private final UserRepository userRepository; // ✅ DB 중복 확인용

    // ✅ 이메일 인증번호 전송
    @PostMapping("/send-code")
    public ResponseEntity<?> sendVerificationCode(@RequestParam String email) {
        try {
            // ✅ 이미 가입된 이메일인지 확인
            if (userRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest()
                        .body("❌ 이미 가입된 이메일입니다. 아이디/비밀번호 찾기를 이용해주세요.");
            }

            // ✅ 인증번호 생성 및 전송
            verificationService.createVerificationCode(email); // ⚡ 여기서 이미 메일 발송됨
            return ResponseEntity.ok("✅ 인증 메일 전송 완료!");

        } catch (MessagingException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("메일 전송 중 오류가 발생했습니다: " + e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("서버 내부 오류: " + e.getMessage());
        }
    }
    @PostMapping("/verify-code-edit")
    public ResponseEntity<String> verifyCodeForEdit(
            @RequestParam String email,
            @RequestParam String code
    ) {
        boolean valid = verificationService.verifyCode(email, code);
        if (valid) {
            return ResponseEntity.ok("✅ 수정용 이메일 인증 성공");
        } else {
            return ResponseEntity.badRequest().body("❌ 인증 실패 (번호 불일치 또는 만료)");
        }
    }

    @PostMapping("/send-code-edit")
    public ResponseEntity<String> sendVerificationCodeForEdit(@RequestParam String email) {
        try {
            // 회원가입용 중복체크는 건너뛴다
            verificationService.createVerificationCode(email);
            return ResponseEntity.ok("✅ 수정용 인증 메일 발송 완료");
        } catch (MessagingException e) {
            return ResponseEntity.internalServerError().body("❌ 이메일 전송 실패: " + e.getMessage());
        }
    }

    // ✅ 인증번호 검증
    @PostMapping("/verify-code")
    public ResponseEntity<?> verifyCode(@RequestParam String email, @RequestParam String code) {
        boolean valid = verificationService.verifyCode(email, code);
        if (valid) {
            return ResponseEntity.ok("✅ 인증 성공");
        }
        return ResponseEntity.badRequest().body("❌ 인증 실패 (번호 불일치 또는 만료)");
    }

    // ✅ 회원가입 (이메일 인증 완료자만 허용)
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            // ✅ 이메일 인증 여부 확인
            if (!verificationService.isVerified(user.getEmail())) {
                return ResponseEntity.badRequest().body("이메일 인증을 완료해주세요!");
            }

            // ✅ 중복 이메일 2차 방어 (혹시 인증 과정 건너뛰었을 경우)
            if (userRepository.findByEmail(user.getEmail()).isPresent()) {
                return ResponseEntity.badRequest().body("이미 가입된 이메일입니다.");
            }

            // ✅ 회원 등록
            User saved = userService.register(user);

            // ✅ 회원가입 완료 후 인증 상태 초기화
            verificationService.clearVerification(user.getEmail());

            return ResponseEntity.ok(saved);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("회원가입 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    // ✅ 로그인
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        return userService.login(username, password)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(401)
                        .body("아이디 또는 비밀번호가 올바르지 않습니다."));
    }

    // ✅ 아이디 중복 체크
    @GetMapping("/check-username")
    public ResponseEntity<?> checkUsername(@RequestParam String username) {
        boolean exists = userService.existsByUsername(username);
        if (exists) {
            return ResponseEntity.badRequest().body("❌ 이미 존재하는 아이디입니다.");
        }
        return ResponseEntity.ok("✅ 사용 가능한 아이디입니다.");
    }
}
