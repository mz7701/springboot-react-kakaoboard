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

        // ✅ 네가 만든 HTML 템플릿 그대로 사용 (String.format으로 코드만 끼워넣기)
        String htmlContent =
                "<div style=\"width:100%%; background-color:#f5f7fa; padding:24px 0; font-family:'Pretendard','Noto Sans KR',Arial,sans-serif;\">" +
                        "  <div style=\"max-width:480px; margin:0 auto; background:#ffffff; border-radius:16px; padding:24px 24px 28px; box-shadow:0 10px 30px rgba(15,23,42,0.12);\">" +
                        "    <div style=\"text-align:center; margin-bottom:24px;\">" +
                        "      <div style=\"display:inline-block; padding:8px 14px; border-radius:999px; background:linear-gradient(135deg,#4f46e5,#ec4899); color:#ffffff; font-size:12px; font-weight:600; letter-spacing:0.04em;\">" +
                        "        Kakaoboard 이메일 인증" +
                        "      </div>" +
                        "      <h1 style=\"margin:16px 0 4px; font-size:22px; font-weight:700; color:#111827;\">이메일 인증번호 안내</h1>" +
                        "      <p style=\"margin:0; font-size:13px; color:#6b7280;\">아래 인증번호를 입력하여 회원가입을 완료해주세요.</p>" +
                        "    </div>" +
                        "    <div style=\"background:#f9fafb; border-radius:14px; padding:18px 16px; border:1px dashed #c4b5fd; text-align:center;\">" +
                        "      <div style=\"font-size:12px; color:#6b7280; margin-bottom:6px;\">이메일 인증번호</div>" +
                        "      <div style=\"font-size:30px; font-weight:700; letter-spacing:6px; color:#4f46e5;\">%s</div>" +
                        "      <p style=\"margin:10px 0 0; font-size:12px; color:#9ca3af;\">본 코드는 발급 후 30분 동안만 유효합니다.</p>" +
                        "    </div>" +
                        "    <p style=\"margin:24px 0 0; font-size:11px; line-height:1.6; color:#9ca3af;\">" +
                        "      본 메일은 발신전용으로 회신되지 않습니다.<br/>" +
                        "      본인이 요청하지 않은 경우, 이 메일은 무시하셔도 됩니다." +
                        "    </p>" +
                        "  </div>" +
                        "</div>";

        // ✅ Brevo API용 요청 바디 (SendGrid JSON 아님!)
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
