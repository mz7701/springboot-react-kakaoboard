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
     * ✅ メール認証コード送信（Brevo HTTP API 使用）
     */
    public void sendVerificationMail(String to, String code) {

        String subject = "[異議あり!!] メール認証コードのお知らせ";

        // ✅ 新しい HTML テンプレート
        String htmlContent =
                "<div style=\"width:100%%; background-color:#f5f7fa; padding:40px 0; font-family:'Pretendard','Noto Sans KR',Arial,sans-serif;\">" +
                        "  <div style=\"max-width:500px; margin:0 auto; background:#ffffff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.08); overflow:hidden;\">" +
                        "    <div style=\"background:linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899); padding:20px 0; text-align:center; color:#fff;\">" +
                        "      <h1 style=\"margin:0; font-size:26px; font-weight:700;\">異議あり!!</h1>" +
                        "      <p style=\"margin:0; font-size:14px; opacity:0.9;\">メール認証のご案内</p>" +
                        "    </div>" +
                        "    <div style=\"padding:30px;\">" +
                        "      <p style=\"font-size:16px; color:#333;\">こんにちは 👋</p>" +
                        "      <p style=\"font-size:15px; color:#555; margin-bottom:20px;\">" +
                        "        ご依頼いただいた<b>メール認証コード</b>は以下の通りです。<br>" +
                        "        下記のコードを入力して認証を完了してください。" +
                        "      </p>" +
                        "      <div style=\"text-align:center; margin:30px 0;\">" +
                        "        <div style=\"display:inline-block; background:#f4f6ff; border:2px dashed #8b5cf6; border-radius:10px; padding:15px 25px;\">" +
                        "          <span style=\"font-size:30px; font-weight:700; letter-spacing:4px; color:#4f46e5;\">%s</span>" +
                        "        </div>" +
                        "      </div>" +
                        "      <p style=\"color:#777; font-size:14px;\">⏰ 有効時間は<b>30分</b>です。</p>" +
                        "      <p style=\"color:#999; font-size:13px;\">もしこのメールに心当たりがない場合は、そのまま削除してください。</p>" +
                        "    </div>" +
                        "    <div style=\"background:#fafafa; padding:15px; text-align:center; border-top:1px solid #eee;\">" +
                        "      <p style=\"font-size:12px; color:#aaa; margin:0;\">" +
                        "        © 2025 異議あり!! | 本メールは自動送信されています。" +
                        "      </p>" +
                        "    </div>" +
                        "  </div>" +
                        "</div>";

        // ✅ Brevo API 用リクエストボディ
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
                    .baseUrl("https://api.brevo.com/v3")                         // ✅ Brevo エンドポイント
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .defaultHeader("api-key", brevoApiKey)                       // ✅ Brevo は Authorization ではなく api-key ヘッダーを使用
                    .build();

            client.post()
                    .uri("/smtp/email")                                         // ✅ Brevo メール送信 API
                    .bodyValue(body)
                    .retrieve()
                    .toBodilessEntity()
                    .block();                                                   // 同期呼び出し

            log.info("✅ メール認証コード送信完了 → {} / コード: {}", to, code);

        } catch (WebClientResponseException e) {
            log.error("❌ Brevo リクエスト失敗 - status: {}, body: {}",
                    e.getRawStatusCode(), e.getResponseBodyAsString(), e);

        } catch (Exception e) {
            log.error("❌ メール送信中に不明な例外が発生しました", e);
        }
    }
}
