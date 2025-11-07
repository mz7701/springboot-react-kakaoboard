package com.example.kakaoboard.service;

import com.example.kakaoboard.domain.User;
import com.example.kakaoboard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService verificationService; // ✅ 이메일 인증 서비스

    /**
     * ✅ 회원가입 로직 (이메일 인증 기반)
     */
    public User register(User user) {
        // ✅ 이메일 형식 검사
        if (user.getEmail() == null || !user.getEmail().contains("@")) {
            throw new IllegalArgumentException("이메일 형식이 올바르지 않습니다.");
        }

        // ✅ 아이디 중복 검사
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 아이디입니다.");
        }

        // ✅ 이메일 중복 검사
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 이메일입니다.");
        }

        // ✅ 이메일 인증 여부 확인
        if (!verificationService.isVerified(user.getEmail())) {
            throw new IllegalArgumentException("이메일 인증을 완료해주세요!");
        }

        // ✅ 비밀번호 유효성 검사 (영문 + 숫자 포함 8자 이상, 특수문자/한글 허용)
        if (!isValidPassword(user.getPassword())) {
            throw new IllegalArgumentException("비밀번호는 영문+숫자 조합 8자 이상이어야 합니다.");
        }

        // ✅ 비밀번호 암호화 후 저장
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User saved = userRepository.save(user);

        // ✅ 회원가입 후 인증 상태 초기화 (보안상)
        verificationService.clearVerification(user.getEmail());

        return saved;
    }

    /**
     * ✅ 로그인
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
     * ✅ 회원정보 수정 (비밀번호 확인 후 닉네임/이메일 변경)
     */
    public User updateUser(String email, String password, String newUsername, String newEmail) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("해당 이메일의 사용자가 존재하지 않습니다."));

        // ✅ 비밀번호 검증
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 올바르지 않습니다.");
        }

        // ✅ 닉네임 중복 검사
        if (!user.getUsername().equals(newUsername) &&
                userRepository.findByUsername(newUsername).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 닉네임입니다.");
        }

        // ✅ 이메일 중복 검사
        if (!user.getEmail().equals(newEmail) &&
                userRepository.findByEmail(newEmail).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 이메일입니다.");
        }

        // ✅ 수정 반영
        user.setUsername(newUsername);
        user.setEmail(newEmail);

        return userRepository.save(user);
    }

    /**
     * ✅ 비밀번호 유효성 검사
     * - 영문 1개 이상 포함
     * - 숫자 1개 이상 포함
     * - 8자 이상
     * - 특수문자, 한글 등은 포함돼도 OK
     */
    private boolean isValidPassword(String password) {
        if (password == null) return false;
        return password.matches("^(?=.*[A-Za-z])(?=.*\\d).{8,}$");
    }

    /**
     * ✅ 아이디 중복 확인
     */
    public boolean existsByUsername(String username) {
        return userRepository.findByUsername(username).isPresent();
    }
    // ✅ 비밀번호 변경 (이메일 기반)
    public void updatePassword(String email, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("해당 이메일로 사용자를 찾을 수 없습니다."));

        // 새 비밀번호 암호화
        String encodedPassword = passwordEncoder.encode(newPassword);
        user.setPassword(encodedPassword);

        // DB 저장
        userRepository.save(user);

        System.out.println("✅ 비밀번호 변경 완료 → " + email);
    }
}
