import React, { useState } from "react";
import axios from "axios";
import styles from "./RegisterPage.module.css";

const RegisterPage = () => {
    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
        passwordCheck: "",
        code: "",
    });

    const [isVerified, setIsVerified] = useState(false);
    const [isCodeSent, setIsCodeSent] = useState(false);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [sending, setSending] = useState(false); // ✅ 중복 요청 방지 추가

    const [errors, setErrors] = useState({
        username: "",
        email: "",
        password: "",
        passwordCheck: "",
        code: "",
        general: "",
    });

    /** ✅ 입력 핸들러 */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
        setErrors((prev) => ({ ...prev, [name]: "" }));

        if (name === "password" || name === "passwordCheck") {
            validatePasswords(
                name === "password" ? value : form.password,
                name === "passwordCheck" ? value : form.passwordCheck
            );
        }
    };

    /** ✅ 비밀번호 유효성 검사 */
    const validatePasswords = (pw, pwCheck) => {
        if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(pw)) {
            setErrors((prev) => ({
                ...prev,
                password: "❌ 비밀번호는 8자 이상이며, 영문과 숫자를 포함해야 합니다.",
            }));
        } else if (pwCheck && pw !== pwCheck) {
            setErrors((prev) => ({
                ...prev,
                passwordCheck: "❌ 비밀번호가 일치하지 않습니다.",
            }));
        } else {
            setErrors((prev) => ({ ...prev, password: "", passwordCheck: "" }));
        }
    };

    /** ✅ 아이디 중복 확인 */
    const checkUsername = async () => {
        if (!form.username.trim())
            return setErrors((prev) => ({
                ...prev,
                username: "❌ 아이디를 입력해주세요.",
            }));

        setIsCheckingUsername(true);
        try {
            await axios.get(
                `http://192.168.0.189:8080/api/auth/check-username?username=${form.username}`
            );
            setErrors((prev) => ({ ...prev, username: "✅ 사용 가능한 아이디입니다." }));
        } catch {
            setErrors((prev) => ({ ...prev, username: "❌ 이미 존재하는 아이디입니다." }));
        } finally {
            setIsCheckingUsername(false);
        }
    };

    /** ✅ 이메일 인증번호 전송 */
    const sendCode = async () => {
        if (sending || isCodeSent) return; // ✅ 중복 요청 방지
        if (!form.email.trim())
            return setErrors((prev) => ({ ...prev, email: "❌ 이메일을 입력해주세요." }));

        setSending(true); // ✅ 요청 시작
        try {
            await axios.post("http://192.168.0.189:8080/api/auth/send-code", null, {
                params: { email: form.email },
            });
            setIsCodeSent(true);
            alert("📩 인증번호를 이메일로 보냈습니다.");
        } catch (err) {
            const msg = err.response?.data?.includes("이미 가입된")
                ? "❌ 이미 가입된 이메일입니다. 아이디/비밀번호 찾기를 이용해주세요."
                : "❌ 이메일 전송 실패. 서버 오류입니다.";
            setErrors((prev) => ({ ...prev, email: msg }));
        } finally {
            setSending(false); // ✅ 요청 종료
        }
    };

    /** ✅ 인증번호 확인 */
    const verifyCode = async () => {
        if (!form.code.trim())
            return setErrors((prev) => ({ ...prev, code: "❌ 인증번호를 입력해주세요." }));

        try {
            const res = await axios.post(
                "http://192.168.0.189:8080/api/auth/verify-code",
                null,
                { params: { email: form.email, code: form.code } }
            );

            if (typeof res.data === "string" && res.data.includes("성공")) {
                alert("✅ 이메일 인증이 완료되었습니다!");
                setIsVerified(true);
                setErrors((prev) => ({ ...prev, code: "" }));
            } else {
                setErrors((prev) => ({
                    ...prev,
                    code: "❌ 인증 실패: 인증번호가 올바르지 않습니다.",
                }));
            }
        } catch (err) {
            const msg =
                err.response?.data || "❌ 인증 실패: 서버 오류 또는 잘못된 인증번호입니다.";
            setErrors((prev) => ({ ...prev, code: msg }));
        }
    };

    /** ✅ 회원가입 처리 */
    const handleSubmit = async (e) => {
        e.preventDefault();

        let newErrors = {};
        if (!form.username.trim()) newErrors.username = "❌ 아이디를 입력해주세요.";
        if (!form.email.trim()) newErrors.email = "❌ 이메일을 입력해주세요.";
        if (!form.password.trim()) newErrors.password = "❌ 비밀번호를 입력해주세요.";
        if (!form.passwordCheck.trim())
            newErrors.passwordCheck = "❌ 비밀번호 확인을 입력해주세요.";
        if (!isVerified) newErrors.code = "❌ 이메일 인증을 완료해주세요.";

        if (Object.keys(newErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...newErrors }));
            return;
        }

        try {
            await axios.post("http://192.168.0.189:8080/api/auth/register", form);
            alert("✅ 회원가입 성공! 로그인 페이지로 이동합니다.");
            window.location.href = "/login";
        } catch (err) {
            setErrors((prev) => ({
                ...prev,
                general: err.response?.data || "❌ 회원가입 실패. 서버 오류입니다.",
            }));
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.cardWrap}>
                <div className={styles.card}>
                    <h1 className={styles.title}>회원가입 ✨</h1>
                    <p className={styles.subtitle}>이메일 인증 후 가입을 완료하세요</p>

                    {errors.general && <p className={styles.errorMsg}>{errors.general}</p>}

                    {/* ✅ 아이디 중복 확인 */}
                    <div className={styles.emailGroup}>
                        <input
                            type="text"
                            name="username"
                            placeholder="아이디"
                            value={form.username}
                            onChange={handleChange}
                            className={styles.input}
                        />
                        <button
                            type="button"
                            onClick={checkUsername}
                            disabled={isCheckingUsername}
                            className={styles.smallBtn}
                        >
                            중복확인
                        </button>
                    </div>
                    {errors.username && (
                        <p
                            className={
                                errors.username.includes("✅")
                                    ? styles.successMsg
                                    : styles.errorMsg
                            }
                        >
                            {errors.username}
                        </p>
                    )}

                    {/* ✅ 이메일 인증 */}
                    <div className={styles.emailGroup}>
                        <input
                            type="email"
                            name="email"
                            placeholder="이메일 (예: test@naver.com)"
                            value={form.email}
                            onChange={handleChange}
                            className={styles.input}
                        />
                        <button
                            type="button"
                            onClick={sendCode}
                            disabled={sending || isCodeSent} // ✅ 전송 중이거나 완료되면 비활성화
                            className={styles.smallBtn}
                        >
                            {isCodeSent ? "전송됨" : sending ? "전송 중..." : "인증요청"}
                        </button>
                    </div>
                    {errors.email && <p className={styles.errorMsg}>{errors.email}</p>}

                    {isCodeSent && (
                        <div className={styles.codeGroup}>
                            <input
                                type="text"
                                name="code"
                                placeholder="인증번호 입력"
                                value={form.code}
                                onChange={handleChange}
                                className={styles.input}
                            />
                            <button
                                type="button"
                                onClick={verifyCode}
                                disabled={isVerified}
                                className={styles.smallBtn}
                            >
                                {isVerified ? "✅ 완료" : "인증확인"}
                            </button>
                        </div>
                    )}
                    {errors.code && <p className={styles.errorMsg}>{errors.code}</p>}

                    {/* ✅ 비밀번호 입력 */}
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <input
                            type="password"
                            name="password"
                            placeholder="비밀번호 (숫자+영문 8자 이상)"
                            value={form.password}
                            onChange={handleChange}
                            className={styles.input}
                        />
                        {errors.password && <p className={styles.errorMsg}>{errors.password}</p>}

                        <input
                            type="password"
                            name="passwordCheck"
                            placeholder="비밀번호 확인"
                            value={form.passwordCheck}
                            onChange={handleChange}
                            className={styles.input}
                        />
                        {errors.passwordCheck && (
                            <p className={styles.errorMsg}>{errors.passwordCheck}</p>
                        )}

                        <button type="submit" className={styles.primaryBtn}>
                            회원가입 완료
                        </button>
                    </form>

                    <div className={styles.actions}>
                        <button
                            className={styles.linkBtn}
                            onClick={() => (window.location.href = "/login")}
                        >
                            로그인으로 돌아가기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
