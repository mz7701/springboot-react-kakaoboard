package com.example.kakaoboard.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    /**
     * ✅ 인증번호 이메일 발송 (EmailVerificationService에서 호출)
     * @param to 수신자 이메일
     * @param code 인증번호 (6자리)
     */
    public void sendVerificationMail(String to, String code) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setTo(to);
        helper.setFrom("mz7701@naver.com"); // ✅ 반드시 SMTP 계정과 동일해야 함
        helper.setSubject("[Kakaoboard] 이메일 인증번호 안내");

        // ✅ HTML 이메일 디자인
        String htmlContent = """
        <div style="width:100%%; background-color:#f5f7fa; padding:40px 0; font-family:'Pretendard','Noto Sans KR',Arial,sans-serif;">
          <div style="max-width:500px; margin:0 auto; background:#ffffff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.08); overflow:hidden;">
            <div style="background:linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899); padding:20px 0; text-align:center; color:#fff;">
              <h1 style="margin:0; font-size:26px; font-weight:700;">Kakaoboard</h1>
              <p style="margin:0; font-size:14px; opacity:0.9;">이메일 인증 안내</p>
            </div>
            <div style="padding:30px;">
              <p style="font-size:16px; color:#333;">안녕하세요 👋</p>
              <p style="font-size:15px; color:#555; margin-bottom:20px;">
                요청하신 <b>이메일 인증번호</b>는 아래와 같습니다.<br>
                해당 코드를 입력하여 인증을 완료해주세요.
              </p>
              <div style="text-align:center; margin:30px 0;">
                <div style="display:inline-block; background:#f4f6ff; border:2px dashed #8b5cf6; border-radius:10px; padding:15px 25px;">
                  <span style="font-size:30px; font-weight:700; letter-spacing:4px; color:#4f46e5;">%s</span>
                </div>
              </div>
              <p style="color:#777; font-size:14px;">⏰ 유효시간은 <b>30분</b>입니다.</p>
              <p style="color:#999; font-size:13px;">이 요청을 본인이 하지 않았다면 이 메일을 무시해주세요.</p>
            </div>
            <div style="background:#fafafa; padding:15px; text-align:center; border-top:1px solid #eee;">
              <p style="font-size:12px; color:#aaa; margin:0;">
                © 2025 Kakaoboard | 본 메일은 자동 발송되었습니다.
              </p>
            </div>
          </div>
        </div>
        """.formatted(code);

        helper.setText(htmlContent, true);
        mailSender.send(message);

        System.out.println("✅ 이메일 인증코드 전송 완료 → " + to + " / 코드: " + code);
    }
}