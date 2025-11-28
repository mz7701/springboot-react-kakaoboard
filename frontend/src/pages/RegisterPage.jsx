import React, { useState } from "react";

import styles from "./RegisterPage.module.css";
import axios from "axios";
import { API_BASE_URL } from "../api/baseURL";   // パスはファイル位置により ../ または ../../

axios.defaults.baseURL = API_BASE_URL;

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
    const [sending, setSending] = useState(false); // ✅ 重複リクエスト防止用フラグ

    const [errors, setErrors] = useState({
        username: "",
        email: "",
        password: "",
        passwordCheck: "",
        code: "",
        general: "",
    });

    /** ✅ 入力ハンドラー */
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

    /** ✅ パスワードのバリデーション */
    const validatePasswords = (pw, pwCheck) => {
        // 🔁 英字 + 数字をそれぞれ1文字以上含み、8文字以上（それ以外の文字は自由）
        const pwRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

        if (!pwRegex.test(pw)) {
            setErrors((prev) => ({
                ...prev,
                password: "❌ パスワードは8文字以上で、英字と数字をそれぞれ1文字以上含めてください。",
                // 形式自体が間違っている場合は、ひとまず確認用パスワードのエラーはそのまま
                passwordCheck: prev.passwordCheck,
            }));
        } else if (pwCheck && pw !== pwCheck) {
            setErrors((prev) => ({
                ...prev,
                passwordCheck: "❌ パスワードが一致しません。",
            }));
        } else {
            setErrors((prev) => ({ ...prev, password: "", passwordCheck: "" }));
        }
    };

    /** ✅ ID重複チェック */
    const checkUsername = async () => {
        if (!form.username.trim())
            return setErrors((prev) => ({
                ...prev,
                username: "❌ IDを入力してください。",
            }));

        setIsCheckingUsername(true);
        try {
            await axios.get(
                `/api/auth/check-username?username=${form.username}`
            );
            setErrors((prev) => ({ ...prev, username: "✅ 使用可能なIDです。" }));
        } catch {
            setErrors((prev) => ({ ...prev, username: "❌ 既に存在するIDです。" }));
        } finally {
            setIsCheckingUsername(false);
        }
    };

    /** ✅ メール認証コード送信 */
    const sendCode = async () => {
        if (sending || isCodeSent) return; // ✅ 重複リクエスト防止
        if (!form.email.trim())
            return setErrors((prev) => ({ ...prev, email: "❌ メールアドレスを入力してください。" }));

        setSending(true); // ✅ リクエスト開始
        try {
            await axios.post("/api/auth/send-code", null, {
                params: { email: form.email },
            });
            setIsCodeSent(true);
            alert("📩 認証コードをメールに送信しました。");
        } catch (err) {
            const msg = err.response?.data?.includes("이미 가입된")
                ? "❌ すでに登録されているメールアドレスです。ID/パスワード検索をご利用ください。"
                : "❌ メール送信に失敗しました。サーバーエラーです。";
            setErrors((prev) => ({ ...prev, email: msg }));
        } finally {
            setSending(false); // ✅ リクエスト終了
        }
    };

    /** ✅ 認証コード確認 */
    const verifyCode = async () => {
        if (!form.code.trim())
            return setErrors((prev) => ({ ...prev, code: "❌ 認証コードを入力してください。" }));

        try {
            const res = await axios.post(
                "/api/auth/verify-code",
                null,
                { params: { email: form.email, code: form.code } }
            );

            if (typeof res.data === "string" && res.data.includes("성공")) {
                alert("✅ メール認証が完了しました！");
                setIsVerified(true);
                setErrors((prev) => ({ ...prev, code: "" }));
            } else {
                setErrors((prev) => ({
                    ...prev,
                    code: "❌ 認証失敗：認証コードが正しくありません。",
                }));
            }
        } catch (err) {
            const msg =
                err.response?.data || "❌ 認証失敗：サーバーエラー、または不正な認証コードです。";
            setErrors((prev) => ({ ...prev, code: msg }));
        }
    };

    /** ✅ 会員登録処理 */
    const handleSubmit = async (e) => {
        e.preventDefault();

        let newErrors = {};
        if (!form.username.trim()) newErrors.username = "❌ IDを入力してください。";
        if (!form.email.trim()) newErrors.email = "❌ メールアドレスを入力してください。";
        if (!form.password.trim()) newErrors.password = "❌ パスワードを入力してください。";
        if (!form.passwordCheck.trim())
            newErrors.passwordCheck = "❌ パスワード確認を入力してください。";
        if (!isVerified) newErrors.code = "❌ メール認証を完了してください。";

        if (Object.keys(newErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...newErrors }));
            return;
        }

        try {
            await axios.post("/api/auth/register", form);
            alert("✅ 会員登録に成功しました！ログインページへ移動します。");
            window.location.href = "/login";
        } catch (err) {
            setErrors((prev) => ({
                ...prev,
                general: err.response?.data || "❌ 会員登録に失敗しました。サーバーエラーです。",
            }));
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.cardWrap}>
                <div className={styles.card}>
                    <h1 className={styles.title}>新規会員登録 ✨</h1>
                    <p className={styles.subtitle}>メール認証を行ってから登録を完了してください。</p>

                    {errors.general && <p className={styles.errorMsg}>{errors.general}</p>}

                    {/* ✅ ID重複チェック */}
                    <div className={styles.emailGroup}>
                        <input
                            type="text"
                            name="username"
                            placeholder="ID"
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
                            重複確認
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

                    {/* ✅ メール認証 */}
                    <div className={styles.emailGroup}>
                        <input
                            type="email"
                            name="email"
                            placeholder="メールアドレス"
                            value={form.email}
                            onChange={handleChange}
                            className={styles.input}
                        />
                        <button
                            type="button"
                            onClick={sendCode}
                            disabled={sending || isCodeSent} // ✅ 送信中または送信済みなら無効
                            className={styles.smallBtn}
                        >
                            {isCodeSent ? "送信済み" : sending ? "送信中..." : "認証"}
                        </button>
                    </div>
                    {errors.email && <p className={styles.errorMsg}>{errors.email}</p>}

                    {isCodeSent && (
                        <div className={styles.codeGroup}>
                            <input
                                type="text"
                                name="code"
                                placeholder="認証コードを入力"
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
                                {isVerified ? "認証完了" : "認証確認"}
                            </button>
                        </div>
                    )}
                    {errors.code && <p className={styles.errorMsg}>{errors.code}</p>}

                    {/* ✅ パスワード入力 */}
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <input
                            type="password"
                            name="password"
                            placeholder="パスワード（数字+英字を含む8文字以上）"
                            value={form.password}
                            onChange={handleChange}
                            className={styles.input}
                        />
                        {errors.password && <p className={styles.errorMsg}>{errors.password}</p>}

                        <input
                            type="password"
                            name="passwordCheck"
                            placeholder="パスワード確認"
                            value={form.passwordCheck}
                            onChange={handleChange}
                            className={styles.input}
                        />
                        {errors.passwordCheck && (
                            <p className={styles.errorMsg}>{errors.passwordCheck}</p>
                        )}

                        <button type="submit" className={styles.primaryBtn}>
                            会員登録を完了する
                        </button>
                    </form>

                    <div className={styles.actions}>
                        <button
                            className={styles.linkBtn}
                            onClick={() => (window.location.href = "/login")}
                        >
                            ログイン画面に戻る
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
