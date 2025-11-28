package com.example.kakaoboard.controller;

import com.example.kakaoboard.domain.User;
import com.example.kakaoboard.repository.UserRepository;
import com.example.kakaoboard.service.UserService;
import com.example.kakaoboard.service.EmailVerificationService;
import com.example.kakaoboard.service.EmailService;
// ✅ MessagingException は使用していないため import 不要
// import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
    private final EmailService emailService;      // ✅ メール送信サービス
    private final UserRepository userRepository;  // ✅ 重複チェック用リポジトリ

    // ✅ メール認証コード送信（新規登録用）
    @PostMapping("/send-code")
    public ResponseEntity<?> sendVerificationCode(@RequestParam String email) {
        try {
            // ✅ すでに登録済みのメールか確認
            if (userRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest()
                        .body("❌ すでに登録されているメールアドレスです。ID／パスワード検索機能をご利用ください。");
            }

            // ✅ 認証コードを生成して送信（この中でメール送信まで実行）
            verificationService.createVerificationCode(email);

            return ResponseEntity.ok("✅ 認証メールを送信しました。");

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("メール送信中にエラーが発生しました: " + e.getMessage());
        }
    }

    // ✅ プロフィール編集用：認証コード検証
    @PostMapping("/verify-code-edit")
    public ResponseEntity<String> verifyCodeForEdit(
            @RequestParam String email,
            @RequestParam String code
    ) {
        boolean valid = verificationService.verifyCode(email, code);
        if (valid) {
            return ResponseEntity.ok("✅ 編集用メール認証に成功しました。");
        } else {
            return ResponseEntity.badRequest().body("❌ 認証失敗（コード不一致または有効期限切れ）");
        }
    }

    // ✅ プロフィール編集用：認証コード送信（重複チェックなし）
    @PostMapping("/send-code-edit")
    public ResponseEntity<String> sendVerificationCodeForEdit(@RequestParam String email) {
        try {
            // 会員情報編集用：既存メールであっても送信を許可
            verificationService.createVerificationCode(email);
            return ResponseEntity.ok("✅ 編集用認証メールの送信が完了しました。");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("❌ メール送信に失敗しました: " + e.getMessage());
        }
    }

    // ✅ 認証コード検証（新規登録用）
    @PostMapping("/verify-code")
    public ResponseEntity<?> verifyCode(
            @RequestParam String email,
            @RequestParam String code
    ) {
        boolean valid = verificationService.verifyCode(email, code);
        if (valid) {
            return ResponseEntity.ok("✅ 認証に成功しました。");
        }
        return ResponseEntity.badRequest().body("❌ 認証失敗（コード不一致または有効期限切れ）");
    }

    // ✅ 会員登録（メール認証完了ユーザーのみ許可）
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            // ✅ メール認証済みか確認
            if (!verificationService.isVerified(user.getEmail())) {
                return ResponseEntity.badRequest().body("メール認証を完了してください。");
            }

            // ✅ メール重複の二重チェック
            if (userRepository.findByEmail(user.getEmail()).isPresent()) {
                return ResponseEntity.badRequest().body("すでに登録されているメールアドレスです。");
            }

            // ✅ ユーザー登録
            User saved = userService.register(user);

            // ✅ 登録完了後は認証状態をクリア
            verificationService.clearVerification(user.getEmail());

            return ResponseEntity.ok(saved);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("会員登録中にエラーが発生しました: " + e.getMessage());
        }
    }

    // ✅ ログイン
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        return userService.login(username, password)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("ユーザーIDまたはパスワードが正しくありません。"));
    }

    // ✅ ユーザーID重複チェック
    @GetMapping("/check-username")
    public ResponseEntity<?> checkUsername(@RequestParam String username) {
        boolean exists = userService.existsByUsername(username);
        if (exists) {
            return ResponseEntity.badRequest().body("❌ すでに存在するユーザーIDです。");
        }
        return ResponseEntity.ok("✅ 使用可能なユーザーIDです。");
    }
}
