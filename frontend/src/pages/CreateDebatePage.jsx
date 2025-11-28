import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./CreateDebatePage.module.css";

import { API_BASE_URL } from "../api/baseURL";   // パスはファイル位置によって ../ または ../../

axios.defaults.baseURL = API_BASE_URL;

// ✅ axios 基本設定（同じネットワークからアクセスできるように IP ベース）

const CreateDebatePage = () => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("ゲーム");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const storedUser = localStorage.getItem("user");
    const currentUser = storedUser ? JSON.parse(storedUser) : null;

    // ✅ 討論投稿処理
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!currentUser) {
            alert("⚠️ ログイン後にご利用ください。");
            navigate("/login");
            return;
        }

        if (!title.trim() || !content.trim()) {
            alert("タイトルと内容をすべて入力してください！");
            return;
        }

        setLoading(true);
        try {
            await axios.post(
                "/api/debates",
                {
                    title,
                    content,
                    author: currentUser.username,
                    category,
                },
                {
                    headers: { "Content-Type": "application/json; charset=UTF-8" },
                }
            );

            alert("✅ 討論が正常に登録されました！");
            if (window.confirm("自分の投稿一覧に移動しますか？")) {
                navigate("/mypage");
            } else {
                navigate("/");
            }
        } catch (err) {
            console.error("❌ 討論登録に失敗しました:", err);

            if (err.code === "ERR_NETWORK") {
                alert("サーバーに接続できません。バックエンドが起動しているか確認してください。");
            } else if (err.response?.status === 403) {
                alert("アクセス権限がありません。もう一度ログインしてください。");
            } else {
                alert("討論登録中にエラーが発生しました: " + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>✏️ 新しい討論を作成</h1>

            <form onSubmit={handleSubmit} className={styles.form}>
                {/* ✅ カテゴリー選択 */}
                <div className={styles.categoryBox}>
                    <label className={styles.label}>カテゴリーを選択</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={styles.select}
                    >
                        <option value="ゲーム">ゲーム</option>
                        <option value="社会">社会</option>
                        <option value="恋愛">恋愛</option>
                        <option value="スポーツ">スポーツ</option>
                        <option value="その他">その他</option>
                    </select>
                </div>

                {/* ✅ タイトル入力 */}
                <div className={styles.inputGroup}>
                    <label className={styles.label}>タイトル</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="討論のタイトルを入力してください"
                        className={styles.input}
                    />
                </div>

                {/* ✅ 内容入力 */}
                <div className={styles.inputGroup}>
                    <label className={styles.label}>内容</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="討論の内容を入力してください"
                        className={styles.textarea}
                    />
                </div>

                {/* ✅ 送信ボタン */}
                <button
                    type="submit"
                    disabled={loading}
                    className={styles.submitButton}
                >
                    {loading ? "登録中..." : "登録する"}
                </button>
            </form>
        </div>
    );
};

export default CreateDebatePage;
