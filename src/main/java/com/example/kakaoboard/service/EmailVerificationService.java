package com.example.kakaoboard.service;

import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private final EmailService emailService;

    // 이메일 -> (코드, 만료시간)
    private final Map<String, VerificationInfo> pending = new ConcurrentHashMap<>();
    // 인증 완료된 이메일
    private final Set<String> verifiedEmails = ConcurrentHashMap.newKeySet();

    private static final long EXPIRE_MINUTES = 30L;

    /**
     * ✅ 인증번호 생성 + 메일 발송
     */
    public void createAndSendCode(String email) throws MessagingException {
        String code = String.format("%06d", new Random().nextInt(1_000_000));
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(EXPIRE_MINUTES);

        pending.put(email, new VerificationInfo(code, expiresAt));
        emailService.sendVerificationMail(email, code);

        System.out.println("📨 인증번호 생성 & 메일 발송 → " + email + " / 코드: " + code);
    }

    /**
     * ✅ 코드 검증
     */
    public boolean verifyCode(String email, String code) {
        VerificationInfo info = pending.get(email);
        if (info == null) {
            System.out.println("❌ 인증 정보 없음: " + email);
            return false;
        }

        if (LocalDateTime.now().isAfter(info.expiresAt)) {
            pending.remove(email);
            System.out.println("⌛ 인증번호 만료: " + email);
            return false;
        }

        if (!info.code.equals(code)) {
            System.out.println("❌ 인증번호 불일치: " + email);
            return false;
        }

        pending.remove(email);
        verifiedEmails.add(email);
        System.out.println("✅ 이메일 인증 성공 → " + email);
        return true;
    }

    /**
     * ✅ 이미 인증 완료된 이메일인지 확인
     */
    public boolean isVerified(String email) {
        return verifiedEmails.contains(email);
    }

    /**
     * ✅ 새로 만든 정리 메서드
     */
    public void clear(String email) {
        verifiedEmails.remove(email);
        pending.remove(email);
        System.out.println("🧹 인증 상태 초기화 → " + email);
    }

    /**
     * ✅ 옛 코드 호환용 메서드 (UserService 등에서 사용 중)
     *    기존에 호출하던 clearVerification(...) 그대로 두려고 만든 래퍼
     */
    public void clearVerification(String email) {
        clear(email);
    }

    private static class VerificationInfo {
        final String code;
        final LocalDateTime expiresAt;
        VerificationInfo(String code, LocalDateTime expiresAt) {
            this.code = code;
            this.expiresAt = expiresAt;
        }
    }
}
