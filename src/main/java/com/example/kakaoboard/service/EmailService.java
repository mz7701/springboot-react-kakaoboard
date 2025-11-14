package com.example.kakaoboard.service;

import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    // ✅ application.yml -> email.from
    @Value("${email.from}")
    private String fromEmail;

    // ✅ application.yml -> sendgrid.api-key  (Render 환경변수 SENDGRID_API_KEY에서 옴)
    @Value("${sendgrid.api-key}")
    private String sendGridApiKey;

    /**
     * ✅ 이메일 인증번호 발송
     *  - EmailVerificationService 등에서 이 메서드를 호출해서 사용
     */
    public void sendVerificationMail(String to, String code) throws MessagingException {

        String subject = "[Kakaoboard] 이메일 인증번호 안내";

        // ✅ 예쁜 HTML 템플릿 (코드만 %s로 들어감)
        String htmlContent = """
        <div style="width:100%%; background-color:#f5f7fa; padding:30px 0; font-family:'Pretendard','Noto Sans KR',Arial,sans-serif;">
          <div style="max-width:500px; margin:0 auto; background:#ffffff; border-radius:14px; box-shadow:0 4px 20px rgba(0,0,0,0.08); overflow:hidden;">
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
                <div style="display:inline-block; background:#f4f4ff; border:2px dashed #8b5cf6; border-radius:10px; padding:15px 25px;">
                  <div style="font-size:13px; color:#6b7280; margin-bottom:6px;">이메일 인증번호</div>
                  <div style="font-size:28px; letter-spacing:4px; font-weight:700; color:#4f46e5;">%s</div>
                </div>
              </div>
              <p style="font-size:13px; color:#9ca3af;">
                · 본 코드는 발송 후 30분 동안만 유효합니다.<br>
                · 본인이 요청하지 않은 경우, 이 메일을 무시해 주세요.
              </p>
            </div>
            <div style="background:#fafafa; padding:15px; text-align:center; border-top:1px solid #eee;">
              <p style="font-size:12px; color:#aaa; margin:0;">
                © 2025 Kakaoboard | 본 메일은 자동 발송되었습니다.
              </p>
            </div>
          </div>
        </div>
        """.formatted(code);

        // ✅ SendGrid API로 보낼 JSON 바디
        Map<String, Object> body = Map.of(
                "personalizations", List.of(
                        Map.of(
                                "to", List.of(Map.of("email", to)),
                                "subject", subject
                        )
                ),
                "from", Map.of(
                        "email", fromEmail,
                        "name", "Kakaoboard"
                ),
                "content", List.of(
                        Map.of(
                                "type", "text/html",
                                "value", htmlContent
                        )
                )
        );

        // ✅ WebClient로 SendGrid Mail Send API 호출
        WebClient client = WebClient.builder()
                .baseUrl("https://api.sendgrid.com/v3")
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + sendGridApiKey)
                .build();

        client.post()
                .uri("/mail/send")
                .bodyValue(body)
                .retrieve()
                .toBodilessEntity()
                .block(); // 간단히 동기 호출

        log.info("✅ 이메일 인증코드 전송 완료 → {} / 코드: {}", to, code);
    }
}
