import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./Login-IDsearch.module.css";

const LoginIDsearch = () => {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [username, setUsername] = useState("");
    const [isCodeSent, setIsCodeSent] = useState(false);
    const [verified, setVerified] = useState(false);
    const navigate = useNavigate();

    /** ✅ 인증번호 전송 */
    const sendCode = async () => {
        if (!email.trim()) {
            alert("이메일을 입력하세요.");
            return;
        }
        try {
            // ⚠️ 백엔드에서 @RequestParam 사용하므로 params로 전송해야 함
            await axios.post("http://192.168.0.80:8080/api/users/send-code", null, {
                params: { email },
            });
            setIsCodeSent(true);
            alert("✅ 인증번호가 이메일로 전송되었습니다.");
        } catch (err) {
            const msg =
                err.response?.data || "서버 오류: 이메일 전송에 실패했습니다.";
            alert("❌ " + msg);
        }
    };

    /** ✅ 인증번호 확인 + 아이디 조회 */
    const verifyCode = async () => {
        if (!code.trim()) return alert("인증번호를 입력하세요.");
        try {
            // ⚠️ 백엔드 verify-code도 @RequestParam → params로 전송
            await axios.post("http://192.168.0.80:8080/api/users/verify-code", null, {
                params: { email, code },
            });

            setVerified(true);

            // ✅ 인증 완료 후 아이디 조회
            const usernameRes = await axios.post(
                `http://192.168.0.80:8080/api/users/find-username?email=${email}`
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
                            {/* 이메일 입력 */}
                            <label className={styles.label}>이메일</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="가입 시 사용한 이메일"
                                className={styles.input}
                            />

                            {/* 인증 전송 / 확인 단계 */}
                            {!isCodeSent ? (
                                <button onClick={sendCode} className={styles.primaryBtn}>
                                    인증번호 전송
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
                                    <button onClick={verifyCode} className={styles.primaryBtn}>
                                        인증 확인
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        // ✅ 인증 성공 후 결과 표시
                        <div className={styles.resultBox}>
                            <p>회원님의 아이디는</p>
                            <h2 className={styles.username}>{username}</h2>
                            <p>입니다.</p>
                            <div className={styles.actions}>
                                <button
                                    onClick={() => navigate("/login")}
                                    className={styles.linkBtn}
                                >
                                    로그인하기
                                </button>
                                <button
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
