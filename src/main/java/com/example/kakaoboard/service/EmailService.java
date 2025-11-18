package com.example.kakaoboard.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${email.from}")
    private String fromEmail;

    /**
     * ✅ 인증번호 메일 발송
     */
    public void sendVerificationMail(String to, String code) throws MessagingException {
        String subject = "[Kakaoboard] 이메일 인증번호 안내";

        String html =
                "<div style=\"font-family:'Noto Sans KR',sans-serif; padding:24px; background:#f9fafb;\">" +
                        "<h2 style=\"margin:0 0 12px; color:#111827;\">Kakaoboard 이메일 인증</h2>" +
                        "<p style=\"margin:0 0 16px; color:#4b5563;\">" +
                        "아래 인증번호를 입력하여 이메일 인증을 완료해 주세요." +
                        "</p>" +
                        "<div style=\"padding:16px; background:#ffffff; border-radius:8px; border:1px dashed #c4b5fd; text-align:center;\">" +
                        "<div style=\"font-size:12px; color:#6b7280; margin-bottom:6px;\">이메일 인증번호</div>" +
                        "<div style=\"font-size:28px; font-weight:700; letter-spacing:6px; color:#4f46e5;\">" + code + "</div>" +
                        "<p style=\"margin-top:8px; font-size:12px; color:#9ca3af;\">" +
                        "이 코드는 발급 후 30분 동안만 유효합니다." +
                        "</p>" +
                        "</div>" +
                        "<p style=\"margin-top:16px; font-size:11px; color:#9ca3af;\">" +
                        "본 메일은 발신전용입니다. 요청하지 않은 메일이라면 무시하셔도 됩니다." +
                        "</p>" +
                        "</div>";

        sendHtmlMail(to, subject, html);
    }

    /**
     * ✅ SMTP 연결 테스트용 (원하면 사용)
     */
    public void sendTestMail(String to) throws MessagingException {
        String subject = "[Kakaoboard] SMTP 테스트 메일";
        String html = "<p>Railway → Naver SMTP 테스트 메일입니다. 이 메일이 도착하면 성공입니다 🎉</p>";
        sendHtmlMail(to, subject, html);
    }

    /**
     * 내부 공통 HTML 발송 로직
     */
    private void sendHtmlMail(String to, String subject, String html) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true); // HTML

        try {
            mailSender.send(message);
            log.info("✅ 메일 전송 성공: to={}, subject={}", to, subject);
        } catch (MailException e) {
            log.error("❌ 메일 전송 실패: {}", e.getMessage(), e);
            throw e;
        }
    }
}
