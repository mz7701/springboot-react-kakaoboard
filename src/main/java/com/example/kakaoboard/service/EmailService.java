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

    // ✅ application.yml -> email.from
    @Value("${email.from}")
    private String fromEmail;

    // ✅ application.yml -> sendgrid.api-key
    @Value("${sendgrid.api-key}")
    private String sendGridApiKey;

    /**
     * ✅ 이메일 인증번호 발송
     */
    public void sendVerificationMail(String to, String code) {

        String subject = "[Kakaoboard] 이메일 인증번호 안내";

        // ✅ Text Block( """ ) 대신 옛날 방식 문자열로 작성
        // ⚠ String.format 을 쓰기 때문에 100% → 100%% 로 써야 함!!
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

        // ✅ SendGrid API 바디
        Map<String, Object> body = Map.of(
                "personalizations", List.of(
                        Map.of("to", List.of(Map.of("email", to)))
                ),
                "from", Map.of("email", fromEmail),
                "subject", subject,
                "content", List.of(
                        Map.of(
                                "type", "text/html",
                                "value", String.format(htmlContent, code)
                        )
                )
        );

        try {
            WebClient client = WebClient.builder()
                    .baseUrl("https://api.sendgrid.com/v3")
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + sendGridApiKey)
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .build();

            client.post()
                    .uri("/mail/send")
                    .bodyValue(body)
                    .retrieve()
                    .toBodilessEntity()
                    .block(); // 동기 호출

            log.info("✅ 이메일 인증코드 전송 완료 → {} / 코드: {}", to, code);

        } catch (WebClientResponseException e) {
            // 🔥 SendGrid에서 4xx/5xx 떨어져도 여기서만 처리 → 위로 안 올라감
            log.error("❌ SendGrid 요청 실패 - status: {}, body: {}",
                    e.getRawStatusCode(), e.getResponseBodyAsString(), e);

        } catch (Exception e) {
            // 그 외 모든 예외도 여기서 마무리
            log.error("❌ 이메일 전송 중 알 수 없는 예외 발생", e);
        }
    }
}
