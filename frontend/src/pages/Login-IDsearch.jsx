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
    const [sending, setSending] = useState(false);   // ✅ 送信中フラグ
    const navigate = useNavigate();

    /** ✅ 認証コード送信 */
    const sendCode = async () => {
        if (!email.trim()) {
            alert("メールアドレスを入力してください。");
            return;
        }

        // ✅ すでに送信中、または一度送信してコード入力段階なら再度送信禁止
        if (sending || isCodeSent) return;

        try {
            setSending(true);
            console.log("[IDsearch] sendCode 呼び出し", email);   // デバッグ用

            await axios.post("/api/users/send-code", null, {
                params: { email },
            });

            setIsCodeSent(true);
            alert("✅ 認証コードをメールに送信しました。");
        } catch (err) {
            const msg =
                err.response?.data || "サーバーエラー：メール送信に失敗しました。";
            alert("❌ " + msg);
        } finally {
            setSending(false);
        }
    };

    /** ✅ 認証コード確認 + ID検索 */
    const verifyCode = async () => {
        if (!code.trim()) return alert("認証コードを入力してください。");
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
                err.response?.data ||
                "❌ 認証コードが正しくないか、有効期限が切れています。";
            alert(msg);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.cardWrap}>
                <div className={styles.card}>
                    <h1 className={styles.title}>ID検索 🔍</h1>

                    {!verified ? (
                        <>
                            <label className={styles.label}>メールアドレス</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="会員登録時に使用したメールアドレス"
                                className={styles.input}
                            />

                            {!isCodeSent ? (
                                <button
                                    type="button"
                                    onClick={sendCode}
                                    className={styles.primaryBtn}
                                    disabled={sending}                       // ✅ 送信中のときはボタン無効化
                                >
                                    {sending ? "送信中..." : "認証コード送信"}
                                </button>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder="6桁の認証コードを入力"
                                        className={styles.input}
                                    />
                                    <button
                                        type="button"
                                        onClick={verifyCode}
                                        className={styles.primaryBtn}
                                    >
                                        認証確認
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <div className={styles.resultBox}>
                            <p>お客様のログインIDは</p>
                            <h2 className={styles.username}>{username}</h2>
                            <p>です。</p>
                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    onClick={() => navigate("/login")}
                                    className={styles.linkBtn}
                                >
                                    ログインする
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate("/login/passwordsearch")}
                                    className={styles.linkBtn}
                                >
                                    パスワードをお忘れの方
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
