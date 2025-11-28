// Login-IDsearch.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./Login-IDsearch.module.css";
import { API_BASE_URL } from "../api/baseURL";

axios.defaults.baseURL = API_BASE_URL;

const LoginIDsearch = () => {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [username, setUsername] = useState("");
    const [isCodeSent, setIsCodeSent] = useState(false);
    const [verified, setVerified] = useState(false);
    const [sending, setSending] = useState(false);   // ✅ 전송 중 여부
    const navigate = useNavigate();

    /** ✅ 인증번호 전송 */
    const sendCode = async () => {
        if (!email.trim()) {
            alert("이메일을 입력하세요.");
            return;
        }

        // ✅ 이미 전송 중이거나, 한 번 보내고 코드 입력 단계면 다시 호출 금지
        if (sending || isCodeSent) return;

        try {
            setSending(true);
            console.log("[IDsearch] sendCode 호출", email);   // 디버깅용

            await axios.post("/api/users/send-code", null, {
                params: { email },
            });

            setIsCodeSent(true);
            alert("✅ 인증번호가 이메일로 전송되었습니다.");
        } catch (err) {
            const msg =
                err.response?.data || "서버 오류: 이메일 전송에 실패했습니다.";
            alert("❌ " + msg);
        } finally {
            setSending(false);
        }
    };

    /** ✅ 인증번호 확인 + 아이디 조회 */
    const verifyCode = async () => {
        if (!code.trim()) return alert("인증번호를 입력하세요.");
        try {
            await axios.post("/api/users/verify-code", null, {
                params: { email, code },
            });

            setVerified(true);

            const usernameRes = await axios.post(
                `/api/users/find-username?email=${email}`
            );
            setUsername(usernameRes.data);
        } catch (err) {
            const msg =
                err.response?.data || "❌ 인증번호가 올바르지 않거나 만료되었습니다.";
            alert(msg);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.cardWrap}>
                <div className={styles.card}>
                    <h1 className={styles.title}>아이디 찾기 🔍</h1>

                    {!verified ? (
                        <>
                            <label className={styles.label}>이메일</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="가입 시 사용한 이메일"
                                className={styles.input}
                            />

                            {!isCodeSent ? (
                                <button
                                    type="button"
                                    onClick={sendCode}
                                    className={styles.primaryBtn}
                                    disabled={sending}                       // ✅ 전송 중이면 비활성
                                >
                                    {sending ? "전송 중..." : "인증번호 전송"}
                                </button>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder="6자리 인증번호 입력"
                                        className={styles.input}
                                    />
                                    <button
                                        type="button"
                                        onClick={verifyCode}
                                        className={styles.primaryBtn}
                                    >
                                        인증 확인
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <div className={styles.resultBox}>
                            <p>회원님의 아이디는</p>
                            <h2 className={styles.username}>{username}</h2>
                            <p>입니다.</p>
                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    onClick={() => navigate("/login")}
                                    className={styles.linkBtn}
                                >
                                    로그인하기
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate("/login/passwordsearch")}
                                    className={styles.linkBtn}
                                >
                                    비밀번호 찾기
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginIDsearch;
