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

    // ✅ 이메일별 인증정보 저장 (email → 인증번호 + 만료시간)
    private final Map<String, VerificationInfo> verificationMap = new ConcurrentHashMap<>();

    // ✅ 인증 성공한 이메일 목록
    private final Set<String> verifiedEmails = ConcurrentHashMap.newKeySet();

    // ✅ 유효시간 (분)
    private static final long EXPIRE_MINUTES = 30;

    /**
     * ✅ 인증번호 생성 + 전송
     *  - Controller 에서 createVerificationCode(email) 호출해서 사용
     */
    public String createVerificationCode(String email) {
        // 6자리 난수 생성
        String code = String.format("%06d", new Random().nextInt(1_000_000));

        // 만료시간 설정
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(EXPIRE_MINUTES);

        // 메모리에 저장
        verificationMap.put(email, new VerificationInfo(code, expiresAt));

        // 이메일 발송 (예외는 EmailService 안에서 처리)
        emailService.sendVerificationMail(email, code);

        System.out.println("📨 인증번호 전송 완료 → " + email + " / 코드: " + code);
        return code;
    }

    /**
     * ✅ 인증번호 검증
     */
    public boolean verifyCode(String email, String code) {
        VerificationInfo info = verificationMap.get(email);

        if (info == null) {
            System.out.println("❌ 인증 정보 없음: " + email);
            return false;
        }

        // 만료 체크
        if (LocalDateTime.now().isAfter(info.expiresAt)) {
            verificationMap.remove(email);
            System.out.println("⌛ 인증번호 만료: " + email);
            return false;
        }

        boolean match = info.code.equals(code);

        if (match) {
            verifiedEmails.add(email);
            System.out.println("✅ 인증 성공: " + email);
        } else {
            System.out.println("❌ 인증번호 불일치: " + email);
        }

        return match;
    }

    /**
     * ✅ 이미 인증 완료된 이메일인지 확인
     */
    public boolean isVerified(String email) {
        return verifiedEmails.contains(email);
    }

    /**
     * ✅ 특정 이메일의 인증 상태 초기화
     */
    public void clearVerification(String email) {
        verifiedEmails.remove(email);
        verificationMap.remove(email);
        System.out.println("🧹 인증 상태 초기화 완료 → " + email);
    }

    // ✅ 내부 클래스: 코드 + 만료시간
    private static class VerificationInfo {
        final String code;
        final LocalDateTime expiresAt;

        VerificationInfo(String code, LocalDateTime expiresAt) {
            this.code = code;
            this.expiresAt = expiresAt;
        }
    }
}
