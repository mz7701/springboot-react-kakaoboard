package com.example.kakaoboard.controller;

import com.example.kakaoboard.domain.User;
import com.example.kakaoboard.repository.UserRepository;
import com.example.kakaoboard.service.UserService;
import com.example.kakaoboard.service.EmailService;
import com.example.kakaoboard.service.EmailVerificationService;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")  // ✅ このパスとReact側のURLを必ず一致させる
@CrossOrigin(
        origins = {
                "http://localhost:3000",
                "http://192.168.0.21:3000",
                "https://kakaoboard-frontend.onrender.com"
        },
        allowedHeaders = "*",
        allowCredentials = "true"
)
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final EmailVerificationService verificationService;
    private final PasswordEncoder passwordEncoder;

    /** ✅ 会員情報の修正 */
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

    /** ✅ パスワード検証 */
    @PostMapping("/verify")
    public boolean verifyPassword(@RequestBody Map<String, String> data) {
        String email = data.get("email");
        String password = data.get("password");

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) return false;

        User user = userOpt.get();
        return passwordEncoder.matches(password, user.getPassword());
    }

    /** ✅ ユーザーID検索 */
    @PostMapping("/find-username")
    public ResponseEntity<?> findUsername(@RequestParam String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("❌ 存在しないメールアドレスです。");
        }

        User user = userOpt.get();
        String username = user.getUsername();
        return ResponseEntity.ok("'" + username + "'");
    }


    @PostMapping("/send-code")
    public ResponseEntity<?> sendResetCode(@RequestParam String email) {
        try {
            // ✅ 既に登録されているメールアドレスのみ許可
            if (!userRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body("❌ 存在しないメールアドレスです。");
            }

            // ✅ 認証コード生成＋（この中で既にメール送信まで実行）
            verificationService.createVerificationCode(email);

            // ✅ ここでは追加で emailService を絶対に呼び出さないこと！！
            return ResponseEntity.ok("✅ 認証コードがメールアドレス宛に送信されました。");

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("メール送信失敗: " + e.getMessage());
        }
    }

    /** ✅ 認証コードの検証 */
    @PostMapping("/verify-code")
    public ResponseEntity<?> verifyResetCode(@RequestParam String email, @RequestParam String code) {
        boolean valid = verificationService.verifyCode(email, code);
        if (valid) {
            return ResponseEntity.ok("✅ 認証成功");
        }
        return ResponseEntity.badRequest().body("❌ 認証失敗（コード不一致または有効期限切れ）");
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteUser(
            @PathVariable Long id,
            @RequestBody(required = false) DeleteUserRequest request
    ) {
        String email = request != null ? request.getEmail() : null;
        String password = request != null ? request.getPassword() : null;

        userService.deleteUser(id, password);
        return ResponseEntity.ok("退会が完了しました。");
    }

    @Data
    public static class DeleteUserRequest {
        private String email;
        private String password;
    }

    /** ✅ パスワード再設定 */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String newPassword = body.get("newPassword");

        if (!verificationService.isVerified(email)) {
            return ResponseEntity.badRequest().body("先にメール認証を完了してください！");
        }

        try {
            userService.updatePassword(email, newPassword);
            verificationService.clearVerification(email);
            return ResponseEntity.ok("✅ パスワードが正常に変更されました。");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("パスワード変更中のエラー: " + e.getMessage());
        }
    }

    /** ✅ 内部DTO */
    public static class UpdateRequest {
        public String email;
        public String password;
        public String username;
        public String newEmail;
    }
}
