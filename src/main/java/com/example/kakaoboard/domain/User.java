package com.example.kakaoboard.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * 회원 엔티티
 * - username: 아이디 (unique)
 * - email: 이메일 (unique)
 * - password: 암호화된 비밀번호
 * - code: 이메일 인증번호 (transient → DB에 저장되지 않음)
 */
@Entity
@Getter
@Setter
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, unique = true)
    private String email;

    private int exp = 0;
    private int level = 1;

    // ✅ 이메일 인증번호 (DB에는 저장되지 않음)
    @Transient
    private String code;
}
