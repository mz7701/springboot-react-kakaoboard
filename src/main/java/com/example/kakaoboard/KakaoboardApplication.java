package com.example.kakaoboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class KakaoboardApplication {
    public static void main(String[] args) {
        SpringApplication.run(KakaoboardApplication.class, args);
    }
}
//시작하기