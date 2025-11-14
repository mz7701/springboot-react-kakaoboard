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
                // ✅ REST API 이라서 CSRF 끔
                .csrf(csrf -> csrf.disable())

                // ✅ 아래에서 만든 CORS 설정 사용
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // ✅ URL 권한 설정
                .authorizeHttpRequests(auth -> auth
                        // 정적 리소스 / 메인 / 에러
                        .requestMatchers(
                                "/", "/error",
                                "/css/**", "/js/**", "/images/**", "/favicon.ico"
                        ).permitAll()

                        // ✅ 웹소켓 핸드셰이크 주소 허용 (쓰고 있으면)
                        .requestMatchers("/ws/**", "/ws-stomp/**").permitAll()

                        // ✅ 인증 관련 API도 일단 전부 허용
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/users/**").permitAll()

                        // ✅ 토론 조회는 누구나 GET 가능
                        .requestMatchers(HttpMethod.GET, "/api/debates/**").permitAll()

                        // ✅ 디버그 단계: 나머지도 전부 허용
                        .anyRequest().permitAll()
                )

                .httpBasic(Customizer.withDefaults());

        return http.build();
    }

    // ✅ CORS 설정: 로컬 + Render 프론트 허용
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(List.of(
                "http://localhost:3000",
                "http://192.168.0.21:3000",
                "https://kakaoboard-frontend.onrender.com"  // 🔥 프론트 도메인
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
