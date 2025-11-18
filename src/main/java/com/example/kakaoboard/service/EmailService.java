package com.example.kakaoboard.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    // application.yml 에 있는 email.from 사용. 없으면 spring.mail.username 사용
    @Value("${email.from:${spring.mail.username}}")
    private String fromEmail;

    /**
     * ✅ 인증번호 메일 발송 (SMTP / Naver)
     */
    public void sendVerificationMail(String to, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject("[Kakaoboard] 이메일 인증번호 안내");

            String htmlContent = """
                <div style="width:100%%;background:#f5f7fb;padding:24px 0;
                            font-family:'Pretendard','Noto Sans KR',Arial,sans-serif;">
                  <div style="max-width:480px;margin:0 auto;background:#ffffff;
                              border-radius:16px;padding:28px 24px;
                              box-shadow:0 10px 30px rgba(15,23,42,0.12);">

                    <div style="text-align:center;margin-bottom:20px;">
                      <div style="display:inline-block;padding:6px 14px;border-radius:999px;
                                  background:linear-gradient(135deg,#6366f1,#ec4899);
                                  color:#ffffff;font-size:12px;font-weight:600;
                                  letter-spacing:.08em;">
                        KAKAOboard 이메일 인증
                      </div>
                    </div>

                    <h2 style="margin:0 0 12px 0;font-size:22px;color:#111827;
                               text-align:center;">
                      이메일 인증번호를 안내드립니다
                    </h2>

                    <p style="margin:0 0 20px 0;font-size:14px;color:#4b5563;
                              text-align:center;">
                      아래 6자리 인증번호를 회원가입 화면에 입력해 주세요.
                    </p>

                    <div style="text-align:center;margin-bottom:24px;">
                      <span style="display:inline-block;padding:12px 24px;
                                   border-radius:12px;border:1px solid #e5e7eb;
                                   font-size:24px;font-weight:700;letter-spacing:8px;
                                   background:#f9fafb;color:#111827;">
                        %s
                      </span>
                    </div>

                    <p style="margin:0 0 4px 0;font-size:12px;color:#6b7280;">
                      · 인증번호 유효시간: 30분
                    </p>
                    <p style="margin:0;font-size:12px;color:#9ca3af;">
                      · 본인이 요청하지 않은 메일이라면 이 메일은 무시하셔도 됩니다.
                    </p>

                    <div style="margin-top:28px;border-top:1px solid #e5e7eb;
                                padding-top:12px;text-align:center;">
                      <p style="margin:0;font-size:11px;color:#9ca3af;">
                        © 2025 Kakaoboard. 이 메일은 발신전용입니다.
                      </p>
                    </div>
                  </div>
                </div>
                """.formatted(code);

            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("✅ SMTP 이메일 전송 성공 → {} / 코드: {}", to, code);

        } catch (MessagingException e) {
            log.error("❌ SMTP 이메일 전송 실패 (MessagingException)", e);
            // 컨트롤러까지 500으로 올라가게 하고 싶으면 RuntimeException 던짐
            throw new RuntimeException("이메일 전송 중 오류가 발생했습니다.", e);
        } catch (Exception e) {
            log.error("❌ SMTP 이메일 전송 실패 (기타 예외)", e);
            throw new RuntimeException("이메일 전송 중 오류가 발생했습니다.", e);
        }
    }
}
