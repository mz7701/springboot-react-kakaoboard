package com.example.kakaoboard.service;

import com.example.kakaoboard.domain.User;
import com.example.kakaoboard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService verificationService; // ✅ メール認証サービス

    /**
     * ✅ 会員登録ロジック（メール認証ベース）
     */
    public User register(User user) {
        // ✅ メール形式チェック
        if (user.getEmail() == null || !user.getEmail().contains("@")) {
            throw new IllegalArgumentException("メールアドレスの形式が正しくありません。");
        }

        // ✅ ID重複チェック
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new IllegalArgumentException("既に存在するIDです。");
        }

        // ✅ メール重複チェック
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new IllegalArgumentException("既に登録されているメールアドレスです。");
        }

        // ✅ メール認証済みか確認
        if (!verificationService.isVerified(user.getEmail())) {
            throw new IllegalArgumentException("メール認証を完了してください！");
        }

        // ✅ パスワードのバリデーション（英字+数字を含む8文字以上、記号・日本語などは可）
        if (!isValidPassword(user.getPassword())) {
            throw new IllegalArgumentException("パスワードは英字+数字の組み合わせで8文字以上である必要があります。");
        }

        // ✅ パスワードをハッシュ化して保存
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User saved = userRepository.save(user);

        // ✅ 会員登録後は認証状態を初期化（セキュリティのため）
        verificationService.clearVerification(user.getEmail());

        return saved;
    }

    /**
     * ✅ ログイン
     */
    public Optional<User> login(String username, String password) {
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (passwordEncoder.matches(password, user.getPassword())) {
                return Optional.of(user);
            }
        }
        return Optional.empty();
    }

    /**
     * ✅ 会員情報の更新（パスワード確認後、ニックネーム/メール変更）
     */
    @Transactional
    public User updateUser(Long id, String email, String password, String username, String newEmail) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("ユーザーが見つかりません。"));

        // ✅ ニックネーム変更
        if (username != null && !username.isBlank()) {
            user.setUsername(username);
        }

        // ✅ メール変更（null の場合は既存のものを維持）
        if (newEmail != null && !newEmail.isBlank()) {
            user.setEmail(newEmail);
        } else {
            System.out.println("⚠️ メールアドレス変更リクエストなし — 既存のメールを維持: " + user.getEmail());
        }

        // ✅ パスワード変更（入力がある場合のみハッシュ化して更新）
        if (password != null && !password.isBlank()) {
            user.setPassword(passwordEncoder.encode(password));
        }

        // ✅ 既存メールが null でないかを再度チェック（防御的コード）
        if (user.getEmail() == null) {
            throw new IllegalStateException("❌ メールアドレスが空です。更新できません。");
        }

        return userRepository.save(user);
    }

    /**
     * ✅ パスワードのバリデーション
     *  - 英字を1文字以上含む
     *  - 数字を1文字以上含む
     *  - 8文字以上
     *  - 記号、日本語などが含まれていてもOK
     */
    private boolean isValidPassword(String password) {
        if (password == null) return false;
        return password.matches("^(?=.*[A-Za-z])(?=.*\\d).{8,}$");
    }

    /**
     * ✅ ID重複確認
     */
    public boolean existsByUsername(String username) {
        return userRepository.findByUsername(username).isPresent();
    }

    // ✅ パスワード変更（メールベース）
    public void updatePassword(String email, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("該当メールアドレスのユーザーが見つかりません。"));

        // 新しいパスワードをハッシュ化
        String encodedPassword = passwordEncoder.encode(newPassword);
        user.setPassword(encodedPassword);

        // DB保存
        userRepository.save(user);

        System.out.println("✅ パスワード変更完了 → " + email);
    }

    // ✅ パスワード確認後、会員退会
    public void deleteUser(Long userId, String rawPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("存在しない会員です。"));

        // 保存されているパスワードと比較
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new IllegalArgumentException("パスワードが一致しません。");
        }

        userRepository.delete(user);
    }

}
