package com.example.kakaoboard.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 🔥 CORS 필터 활성화 (아래 corsConfigurationSource()랑 연결됨)
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        // ✅ 인증/회원가입/이메일 전송 등은 모두 허용
                        .requestMatchers("/api/auth/**").permitAll()
                        // ✅ 웹소켓 핸드셰이크도 허용
                        .requestMatchers("/ws/**").permitAll()
                        // ✅ 토론 목록 조회는 전체 공개
                        .requestMatchers(HttpMethod.GET, "/api/debates/**").permitAll()
                        // ✅ 나머지도 일단 전부 열어둠 (나중에 JWT 붙이면 막자)
                        .anyRequest().permitAll()
                );

        return http.build();
    }

    // 🔥 진짜 중요한 전역 CORS 설정
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // ✅ 허용할 프론트 도메인들
        config.setAllowedOrigins(List.of(
                "http://localhost:3000",
                "http://192.168.0.21:3000",
                "https://kakaoboard-frontend.onrender.com"  // Render 프론트
        ));

        // ✅ 허용 메서드
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // ✅ 모든 헤더 허용
        config.setAllowedHeaders(List.of("*"));

        // ✅ 쿠키/인증정보 포함 허용 (JWT 쓸 거면 true 유지)
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // 모든 경로에 위 CORS 설정 적용
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
