package com.example.kakaoboard.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    // ✅ application.yml -> brevo.sender-email
    @Value("${brevo.sender-email}")
    private String fromEmail;

    // ✅ application.yml -> brevo.sender-name
    @Value("${brevo.sender-name}")
    private String senderName;

    // ✅ application.yml -> brevo.api-key
    @Value("${brevo.api-key}")
    private String brevoApiKey;

    /**
     * ✅ 이메일 인증번호 발송 (Brevo HTTP API 사용)
     */
    public void sendVerificationMail(String to, String code) {

        String subject = "[Kakaoboard] 이메일 인증번호 안내";

        // ✅ 새 HTML 템플릿 적용
        String htmlContent =
                "<div style=\"width:100%%; background-color:#f5f7fa; padding:40px 0; font-family:'Pretendard','Noto Sans KR',Arial,sans-serif;\">" +
                        "  <div style=\"max-width:500px; margin:0 auto; background:#ffffff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.08); overflow:hidden;\">" +
                        "    <div style=\"background:linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899); padding:20px 0; text-align:center; color:#fff;\">" +
                        "      <h1 style=\"margin:0; font-size:26px; font-weight:700;\">Kakaoboard</h1>" +
                        "      <p style=\"margin:0; font-size:14px; opacity:0.9;\">이메일 인증 안내</p>" +
                        "    </div>" +
                        "    <div style=\"padding:30px;\">" +
                        "      <p style=\"font-size:16px; color:#333;\">안녕하세요 👋</p>" +
                        "      <p style=\"font-size:15px; color:#555; margin-bottom:20px;\">" +
                        "        요청하신 <b>이메일 인증번호</b>는 아래와 같습니다.<br>" +
                        "        해당 코드를 입력하여 인증을 완료해주세요." +
                        "      </p>" +
                        "      <div style=\"text-align:center; margin:30px 0;\">" +
                        "        <div style=\"display:inline-block; background:#f4f6ff; border:2px dashed #8b5cf6; border-radius:10px; padding:15px 25px;\">" +
                        "          <span style=\"font-size:30px; font-weight:700; letter-spacing:4px; color:#4f46e5;\">%s</span>" +
                        "        </div>" +
                        "      </div>" +
                        "      <p style=\"color:#777; font-size:14px;\">⏰ 유효시간은 <b>30분</b>입니다.</p>" +
                        "      <p style=\"color:#999; font-size:13px;\">이 요청을 본인이 하지 않았다면 이 메일을 무시해주세요.</p>" +
                        "    </div>" +
                        "    <div style=\"background:#fafafa; padding:15px; text-align:center; border-top:1px solid #eee;\">" +
                        "      <p style=\"font-size:12px; color:#aaa; margin:0;\">" +
                        "        © 2025 Kakaoboard | 본 메일은 자동 발송되었습니다." +
                        "      </p>" +
                        "    </div>" +
                        "  </div>" +
                        "</div>";

        // ✅ Brevo API용 요청 바디
        Map<String, Object> body = Map.of(
                "sender", Map.of(
                        "email", fromEmail,
                        "name", senderName
                ),
                "to", List.of(
                        Map.of("email", to)
                ),
                "subject", subject,
                "htmlContent", String.format(htmlContent, code)
        );

        try {
            WebClient client = WebClient.builder()
                    .baseUrl("https://api.brevo.com/v3")                         // ✅ Brevo 엔드포인트
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .defaultHeader("api-key", brevoApiKey)                       // ✅ Brevo는 Authorization 말고 api-key 헤더
                    .build();

            client.post()
                    .uri("/smtp/email")                                         // ✅ Brevo 이메일 전송 API
                    .bodyValue(body)
                    .retrieve()
                    .toBodilessEntity()
                    .block();                                                   // 동기 호출

            log.info("✅ 이메일 인증코드 전송 완료 → {} / 코드: {}", to, code);

        } catch (WebClientResponseException e) {
            log.error("❌ Brevo 요청 실패 - status: {}, body: {}",
                    e.getRawStatusCode(), e.getResponseBodyAsString(), e);

        } catch (Exception e) {
            log.error("❌ 이메일 전송 중 알 수 없는 예외 발생", e);
        }
    }
}
