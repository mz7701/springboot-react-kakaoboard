package com.example.kakaoboard.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private final EmailService emailService;

    // ✅ メールアドレスごとの認証情報を保存（email → 認証コード + 有効期限）
    private final Map<String, VerificationInfo> verificationMap = new ConcurrentHashMap<>();

    // ✅ 認証に成功したメールアドレスの一覧
    private final Set<String> verifiedEmails = ConcurrentHashMap.newKeySet();

    // ✅ 有効時間（分）
    private static final long EXPIRE_MINUTES = 30;

    /**
     * ✅ 認証コードの生成 + 送信
     *  - Controller から createVerificationCode(email) を呼び出して使用
     */
    public String createVerificationCode(String email) {
        // 6桁のランダムコード生成
        String code = String.format("%06d", new Random().nextInt(1_000_000));

        // 有効期限を設定
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(EXPIRE_MINUTES);

        // メモリに保存
        verificationMap.put(email, new VerificationInfo(code, expiresAt));

        // メール送信（例外処理は EmailService 側で実施）
        emailService.sendVerificationMail(email, code);

        System.out.println("📨 認証コード送信完了 → " + email + " / コード: " + code);
        return code;
    }

    /**
     * ✅ 認証コードの検証
     */
    public boolean verifyCode(String email, String code) {
        VerificationInfo info = verificationMap.get(email);

        if (info == null) {
            System.out.println("❌ 認証情報が存在しません: " + email);
            return false;
        }

        // 有効期限チェック
        if (LocalDateTime.now().isAfter(info.expiresAt)) {
            verificationMap.remove(email);
            System.out.println("⌛ 認証コードの有効期限切れ: " + email);
            return false;
        }

        boolean match = info.code.equals(code);

        if (match) {
            verifiedEmails.add(email);
            System.out.println("✅ 認証成功: " + email);
        } else {
            System.out.println("❌ 認証コード不一致: " + email);
        }

        return match;
    }

    /**
     * ✅ すでに認証済みのメールアドレスか確認
     */
    public boolean isVerified(String email) {
        return verifiedEmails.contains(email);
    }

    /**
     * ✅ 特定のメールアドレスの認証状態を初期化
     */
    public void clearVerification(String email) {
        verifiedEmails.remove(email);
        verificationMap.remove(email);
        System.out.println("🧹 認証状態の初期化完了 → " + email);
    }

    // ✅ 内部クラス: コード + 有効期限
    private static class VerificationInfo {
        final String code;
        final LocalDateTime expiresAt;

        VerificationInfo(String code, LocalDateTime expiresAt) {
            this.code = code;
            this.expiresAt = expiresAt;
        }
    }
}
