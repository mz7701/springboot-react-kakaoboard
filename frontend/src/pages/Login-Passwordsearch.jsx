import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login-Passwordsearch.module.css";
import axios from "axios";
import { API_BASE_URL } from "../api/baseURL";   // パスはファイル位置によって ../ または ../../

axios.defaults.baseURL = API_BASE_URL;

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
    const [sending, setSending] = useState(false); // ✅ 認証コード送信中フラグ
    const navigate = useNavigate();

    /** ✅ パスワードの正規表現チェック
     *  英字 + 数字 をそれぞれ最低1文字以上含み、8文字以上（記号は含んでもOK）
     */
    const isValidPassword = (password) =>
        /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password);

    /** ✅ 認証コード送信 */
    const sendCode = async () => {
        if (!form.email || !form.username) {
            alert("ユーザーIDとメールアドレスを入力してください。");
            return;
        }
        if (sending || isCodeSent) return;

        try {
            setSending(true);
            // ⚠️ バックエンドでは @RequestParam String email → params で渡す
            await axios.post("/api/users/send-code", null, {
                params: { email: form.email },
            });
            setIsCodeSent(true);
            alert("✅ 認証コードをメールアドレス宛に送信しました。");
        } catch (err) {
            const msg = err.response?.data || "❌ メール送信に失敗しました。";
            alert(msg);
        } finally {
            setSending(false);
        }
    };

    /** ✅ 認証コード確認 */
    const verifyCode = async () => {
        if (!form.code.trim()) {
            alert("認証コードを入力してください。");
            return;
        }

        try {
            await axios.post("/api/users/verify-code", null, {
                params: { email: form.email, code: form.code },
            });
            setVerified(true);
            alert("✅ 認証が完了しました。新しいパスワードを設定してください。");
        } catch (err) {
            const msg =
                err.response?.data ||
                "❌ 認証に失敗しました: コードが間違っているか、有効期限が切れています。";
            alert(msg);
        }
    };

    /** ✅ パスワード再設定 */
    const resetPassword = async () => {
        if (!isValidPassword(form.newPw)) {
            return alert(
                "❌ パスワードは8文字以上で、英字と数字を少なくとも1文字ずつ含めてください。"
            );
        }
        if (form.newPw !== form.confirmPw) {
            return alert("❌ パスワードが一致していません。");
        }

        try {
            // ⚠️ バックエンド UserController は POST /api/users/reset-password を想定
            await axios.post("/api/users/reset-password", {
                email: form.email,
                newPassword: form.newPw,
            });
            alert("✅ パスワードを正常に変更しました。新しいパスワードでログインしてください。");
            navigate("/login");
        } catch (err) {
            const msg =
                err.response?.data ||
                "❌ パスワードの変更に失敗しました。入力内容を確認してください。";
            alert(msg);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.cardWrap}>
                <div className={styles.card}>
                    <h1 className={styles.title}>パスワード再設定 🔐</h1>

                    {/* ✅ ステップ1：認証前 */}
                    {!verified ? (
                        <>
                            <label className={styles.label}>ユーザーID</label>
                            <input
                                type="text"
                                value={form.username}
                                onChange={(e) =>
                                    setForm({ ...form, username: e.target.value })
                                }
                                placeholder="ユーザーIDを入力"
                                className={styles.input}
                            />

                            <label className={styles.label}>メールアドレス</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) =>
                                    setForm({ ...form, email: e.target.value })
                                }
                                placeholder="登録時に使用したメールアドレス"
                                className={styles.input}
                            />

                            {!isCodeSent ? (
                                <button
                                    onClick={sendCode}
                                    className={styles.primaryBtn}
                                    disabled={sending}
                                >
                                    認証コードを送信
                                </button>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        value={form.code}
                                        onChange={(e) =>
                                            setForm({ ...form, code: e.target.value })
                                        }
                                        placeholder="6桁の認証コードを入力"
                                        className={styles.input}
                                    />
                                    <button
                                        onClick={verifyCode}
                                        className={styles.primaryBtn}
                                    >
                                        認証を確認
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            {/* ✅ ステップ2：認証成功後、パスワード再設定 */}
                            <label className={styles.label}>新しいパスワード</label>
                            <input
                                type="password"
                                value={form.newPw}
                                onChange={(e) =>
                                    setForm({ ...form, newPw: e.target.value })
                                }
                                placeholder="8文字以上、英字+数字を含む"
                                className={styles.input}
                            />

                            <label className={styles.label}>パスワード確認</label>
                            <input
                                type="password"
                                value={form.confirmPw}
                                onChange={(e) =>
                                    setForm({ ...form, confirmPw: e.target.value })
                                }
                                placeholder="パスワードをもう一度入力"
                                className={styles.input}
                            />

                            {/* ✅ リアルタイムバリデーションメッセージ */}
                            {form.newPw && !isValidPassword(form.newPw) && (
                                <p
                                    style={{
                                        color: "red",
                                        fontSize: "13px",
                                        marginTop: "-6px",
                                    }}
                                >
                                    ❌ パスワードは8文字以上で、英字と数字を少なくとも1文字ずつ含めてください。
                                </p>
                            )}

                            {form.confirmPw && form.newPw !== form.confirmPw && (
                                <p
                                    style={{
                                        color: "red",
                                        fontSize: "13px",
                                        marginTop: "-6px",
                                    }}
                                >
                                    ❌ パスワードが一致していません。
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
                                パスワードを変更
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPasswordsearch;
