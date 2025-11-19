import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./Login-Passwordsearch.module.css";

const LoginPasswordsearch = () => {
    const [form, setForm] = useState({
        username: "",
        email: "",
        code: "",
        newPw: "",
        confirmPw: "",
    });
    const [isCodeSent, setIsCodeSent] = useState(false);
    const [verified, setVerified] = useState(false);
    const navigate = useNavigate();

    /** ✅ 비밀번호 정규식 검사 */
    const isValidPassword = (password) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password);

    /** ✅ 인증번호 전송 */
    const sendCode = async () => {
        if (!form.email || !form.username) {
            alert("아이디와 이메일을 입력하세요.");
            return;
        }
        try {
            // ⚠️ 백엔드에서는 @RequestParam String email → params로 전달해야 함
            await axios.post("http://192.168.0.80:8080/api/users/send-code", null, {
                params: { email: form.email },
            });
            setIsCodeSent(true);
            alert("✅ 인증번호가 이메일로 전송되었습니다.");
        } catch (err) {
            const msg = err.response?.data || "❌ 이메일 전송 실패.";
            alert(msg);
        }
    };

    /** ✅ 인증번호 검증 */
    const verifyCode = async () => {
        if (!form.code.trim()) {
            alert("인증번호를 입력하세요.");
            return;
        }

        try {
            await axios.post("http://192.168.0.80:8080/api/users/verify-code", null, {
                params: { email: form.email, code: form.code },
            });
            setVerified(true);
            alert("✅ 인증 완료. 새 비밀번호를 설정하세요.");
        } catch (err) {
            const msg = err.response?.data || "❌ 인증 실패: 잘못된 코드이거나 만료되었습니다.";
            alert(msg);
        }
    };

    /** ✅ 비밀번호 재설정 */
    const resetPassword = async () => {
        if (!isValidPassword(form.newPw)) {
            return alert("❌ 비밀번호는 8자 이상이며, 영문과 숫자를 포함해야 합니다.");
        }
        if (form.newPw !== form.confirmPw) {
            return alert("❌ 비밀번호가 일치하지 않습니다.");
        }

        try {
            // ⚠️ 백엔드 UserController는 POST로 /reset-password 사용
            await axios.post("http://192.168.0.80:8080/api/users/reset-password", {
                email: form.email,
                newPassword: form.newPw,
            });
            alert("✅ 비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인하세요.");
            navigate("/login");
        } catch (err) {
            const msg = err.response?.data || "❌ 비밀번호 변경 실패. 정보를 확인하세요.";
            alert(msg);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.cardWrap}>
                <div className={styles.card}>
                    <h1 className={styles.title}>비밀번호 찾기 🔐</h1>

                    {/* ✅ 1단계: 인증 전 */}
                    {!verified ? (
                        <>
                            <label className={styles.label}>아이디</label>
                            <input
                                type="text"
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                placeholder="아이디 입력"
                                className={styles.input}
                            />

                            <label className={styles.label}>이메일</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="가입 시 사용한 이메일"
                                className={styles.input}
                            />

                            {!isCodeSent ? (
                                <button onClick={sendCode} className={styles.primaryBtn}>
                                    인증번호 전송
                                </button>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        value={form.code}
                                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                                        placeholder="6자리 인증번호 입력"
                                        className={styles.input}
                                    />
                                    <button onClick={verifyCode} className={styles.primaryBtn}>
                                        인증 확인
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            {/* ✅ 2단계: 인증 성공 후 비밀번호 재설정 */}
                            <label className={styles.label}>새 비밀번호</label>
                            <input
                                type="password"
                                value={form.newPw}
                                onChange={(e) => setForm({ ...form, newPw: e.target.value })}
                                placeholder="8자 이상, 영문+숫자 포함"
                                className={styles.input}
                            />

                            <label className={styles.label}>비밀번호 확인</label>
                            <input
                                type="password"
                                value={form.confirmPw}
                                onChange={(e) => setForm({ ...form, confirmPw: e.target.value })}
                                placeholder="비밀번호 다시 입력"
                                className={styles.input}
                            />

                            {/* ✅ 실시간 유효성 메시지 */}
                            {form.newPw && !isValidPassword(form.newPw) && (
                                <p style={{ color: "red", fontSize: "13px", marginTop: "-6px" }}>
                                    ❌ 비밀번호는 8자 이상이며, 영문과 숫자를 포함해야 합니다.
                                </p>
                            )}

                            {form.confirmPw && form.newPw !== form.confirmPw && (
                                <p style={{ color: "red", fontSize: "13px", marginTop: "-6px" }}>
                                    ❌ 비밀번호가 일치하지 않습니다.
                                </p>
                            )}

                            <button
                                onClick={resetPassword}
                                className={styles.primaryBtn}
                                disabled={
                                    !isValidPassword(form.newPw) ||
                                    !form.confirmPw ||
                                    form.newPw !== form.confirmPw
                                }
                            >
                                비밀번호 변경
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPasswordsearch;
