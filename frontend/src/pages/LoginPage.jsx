import React, { useState } from "react";

import { useNavigate } from "react-router-dom";
import styles from "./LoginPage.module.css"; // ★ CSSモジュールのインポート
import axios from "axios";
import { API_BASE_URL } from "../api/baseURL";   // パスはファイル位置によって ../ または ../../

axios.defaults.baseURL = API_BASE_URL;

const LoginPage = () => {
    const [form, setForm] = useState({ username: "", password: "" });
    const [showPw, setShowPw] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errMsg, setErrMsg] = useState("");
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setErrMsg("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrMsg("");
        try {
            const res = await axios.post("/api/auth/login", form);
            localStorage.setItem("user", JSON.stringify(res.data));
            alert("✅ ログインに成功しました！");
            navigate("/board");
        } catch (err) {
            setErrMsg("IDまたはパスワードをご確認ください。");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKakaoLogin = () => {
        window.location.href = "/oauth2/authorization/kakao";
    };

    return (
        <div className={styles.page}>
            {/* 背景デコレーション */}
            <div className={styles.bgLayer} aria-hidden />

            {/* カード */}
            <div className={styles.cardWrap}>
                <div className={styles.card}>
                    <header className={styles.cardHeader}>
                        <h1 className={styles.title}>ようこそ 👋</h1>
                        <p className={styles.subtitle}>
                            アカウントでログインするか、カカオでかんたんログインできます。
                        </p>
                    </header>

                    {errMsg && (
                        <div role="alert" className={styles.errorBox}>
                            <strong>ログインに失敗しました:</strong> {errMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {/* ID */}
                        <label className={styles.label}>
                            <span className={styles.labelText}>ID</span>
                            <div className={styles.inputGroup}>
                                <span className={styles.icon} aria-hidden>
                                    {/* user icon */}
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5zM4 22c0-4.419 3.581-8 8-8s8 3.581 8 8"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    name="username"
                                    value={form.username}
                                    onChange={handleChange}
                                    placeholder="IDを入力してください"
                                    className={styles.input}
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </label>

                        {/* パスワード */}
                        <label className={styles.label}>
                            <span className={styles.labelText}>パスワード</span>
                            <div className={styles.inputGroup}>
                                <span className={styles.icon} aria-hidden>
                                    {/* lock icon */}
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M7 10V7a5 5 0 0 1 10 0v3"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                        />
                                        <rect
                                            x="5"
                                            y="10"
                                            width="14"
                                            height="10"
                                            rx="2"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                        />
                                    </svg>
                                </span>
                                <input
                                    type={showPw ? "text" : "password"}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="パスワードを入力してください"
                                    className={styles.input}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((s) => !s)}
                                    className={styles.togglePw}
                                    aria-label={showPw ? "パスワードを隠す" : "パスワードを表示"}
                                >
                                    {showPw ? (
                                        // eye-off
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                            <path
                                                d="M3 3l18 18M9.88 9.88A3 3 0 0112 9a3 3 0 013 3c0 .53-.138 1.03-.38 1.46M6.18 6.18C4.23 7.43 2.74 9.17 2 12c2.5 6 8 8 10 8 1.57 0 3.3-.47 4.88-1.47M20.82 17.82C21.77 16.57 22.52 14.95 22 12c-2.5-6-8-8-10-8-.86 0-1.72.12-2.56.38"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    ) : (
                                        // eye
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                            <path
                                                d="M2 12c2.5-6 8-8 10-8s7.5 2 10 8c-2.5 6-8 8-10 8s-7.5-2-10-8z"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                            />
                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="3"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                            />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </label>

                        {/* アクション */}
                        <div className={styles.actions}>
                            <button
                                type="submit"
                                className={styles.primaryBtn}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className={styles.loading}>
                                        <span className={styles.spinner} /> ログイン処理中…
                                    </span>
                                ) : (
                                    "ログイン"
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleKakaoLogin}
                                className={styles.kakaoBtn}
                                aria-label="カカオでログイン"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M12 3C6.477 3 2 6.672 2 11.2c0 2.65 1.573 4.973 3.986 6.449L5.5 21l3.233-1.937c1.09.303 2.255.47 3.267.47 5.523 0 10-3.672 10-8.2S17.523 3 12 3z"
                                        fill="currentColor"
                                    />
                                </svg>
                                カカオでログイン
                            </button>

                            <button
                                onClick={() => navigate("/login/idsearch")}
                                className={styles.linkBtn}
                            >
                                ID検索
                            </button>
                            <button
                                onClick={() => navigate("/login/passwordsearch")}
                                className={styles.linkBtn}
                            >
                                パスワードをお忘れの方
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate("/register")}
                                className={styles.linkBtn}
                            >
                                新規会員登録
                            </button>
                        </div>
                    </form>
                </div>

                <p className={styles.helperText}>
                    ログインに問題がありますか？{" "}
                    <strong>管理者までお問い合わせ</strong>ください。
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
