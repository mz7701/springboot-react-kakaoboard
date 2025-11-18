package com.example.kakaoboard.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetSocketAddress;
import java.net.Socket;

@RestController
@RequestMapping("/api/debug")
@Slf4j
public class SmtpDebugController {

    /**
     * ✅ Railway 서버에서 smtp.naver.com:587 포트가 열려있는지 확인하는 엔드포인트
     */
    @GetMapping("/smtp-connect")
    public ResponseEntity<String> testSmtpConnect() {
        String host = "smtp.naver.com";
        int port = 587;
        int timeoutMs = 5000;

        try (Socket socket = new Socket()) {
            long start = System.currentTimeMillis();
            socket.connect(new InetSocketAddress(host, port), timeoutMs);
            long end = System.currentTimeMillis();

            String msg = String.format(
                    "✅ CONNECT SUCCESS: %s:%d 에 %dms 만에 연결됨",
                    host, port, (end - start)
            );

            log.info(msg);
            return ResponseEntity.ok(msg);
        } catch (Exception e) {
            String msg = "❌ CONNECT FAILED: " + e.getClass().getName() + " - " + e.getMessage();
            log.error(msg, e);
            return ResponseEntity.internalServerError().body(msg);
        }
    }
}
