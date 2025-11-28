package com.example.kakaoboard.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * 会員エンティティ
 * - username: ログインID（unique）
 * - email: メールアドレス（unique）
 * - password: ハッシュ化されたパスワード
 * - code: メール認証コード（transient → DBには保存されない）
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

    // ✅ メール認証コード（DBには保存しない）
    @Transient
    private String code;
}
