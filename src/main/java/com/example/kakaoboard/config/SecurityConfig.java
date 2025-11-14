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
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // ✅ REST API 방식이니까 CSRF는 일단 끔
                .csrf(csrf -> csrf.disable())

                // ✅ 아래에서 만든 CORS 설정 사용
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // ✅ URL 별 권한 설정
                .authorizeHttpRequests(auth -> auth
                        // 정적 리소스 / 메인 / 에러 페이지
                        .requestMatchers(
                                "/", "/error",
                                "/css/**", "/js/**", "/images/**", "/favicon.ico"
                        ).permitAll()

                        // ✅ (필요하다면) 웹소켓 핸드셰이크 주소들도 허용
                        .requestMatchers(
                                "/ws/**",
                                "/ws-stomp/**"
                        ).permitAll()

                        // ✅ 로그인/회원가입/이메일 인증 등 인증 관련 API 전부 개방
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/users/**").permitAll()

                        // ✅ 토론 목록/조회는 누구나 볼 수 있게 (GET만)
                        .requestMatchers(HttpMethod.GET, "/api/debates/**").permitAll()

                        // ✅ 나머지도 일단 전부 개방 (디버깅/개발 단계용)
                        .anyRequest().permitAll()
                )

                // 기본 httpBasic 정도만 켜둠 (실제로는 거의 안 씀)
                .httpBasic(Customizer.withDefaults());

        return http.build();
    }

    // ✅ CORS 설정: 로컬 + Render 프론트 도메인 허용
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // 🔥 프론트가 요청을 날릴 수 있는 출처(origin) 목록
        config.setAllowedOrigins(List.of(
                "http://localhost:3000",
                "http://192.168.0.21:3000",
                "https://kakaoboard-frontend.onrender.com" // Render 프론트
        ));

        // 허용할 HTTP 메서드
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // 허용할 헤더
        config.setAllowedHeaders(List.of("*"));

        // 쿠키 / 인증정보 전송 허용 여부
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // 모든 경로에 위 설정 적용
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // ✅ 비밀번호 암호화용 (이미 쓰고 있으면 이름 그대로 재사용됨)
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
