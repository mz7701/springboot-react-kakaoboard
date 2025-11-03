import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./CreateDebatePage.module.css";

// ✅ axios 기본 설정
axios.defaults.baseURL = "http://localhost:8080";
axios.defaults.headers.post["Content-Type"] = "application/json";

const CreateDebatePage = () => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("게임"); // 기본값
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const storedUser = localStorage.getItem("user");
    const currentUser = storedUser ? JSON.parse(storedUser) : null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("⚠️ 로그인 후 이용해주세요.");
            navigate("/login");
            return;
        }

        if (!title.trim() || !content.trim()) {
            alert("제목과 내용을 모두 입력해주세요!");
            return;
        }

        setLoading(true);
        try {
            await axios.post("/api/debates", {
                title,
                content,
                author: currentUser.username,
                category,
            });

            alert("✅ 토론이 등록되었습니다!");
            if (window.confirm("내가 쓴 게시글로 이동하시겠습니까?")) {
                navigate("/mypage");
            } else {
                navigate("/");
            }
        } catch (err) {
            console.error("❌ 토론 등록 실패:", err);
            alert("토론 등록 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>✏️ 새 토론 등록</h1>

            <form onSubmit={handleSubmit} className={styles.form}>
                {/* ✅ 카테고리 선택 */}
                <div className={styles.categoryBox}>
                    <label className={styles.label}>카테고리 선택</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={styles.select}
                    >
                        <option value="게임">게임</option>
                        <option value="사회">사회</option>
                        <option value="연애">연애</option>
                        <option value="스포츠">스포츠</option>
                        <option value="기타">기타</option>
                    </select>
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="토론 제목을 입력하세요"
                        className={styles.input}
                    />
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>내용</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="토론 내용을 입력하세요"
                        className={styles.textarea}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={styles.submitButton}
                >
                    {loading ? "등록 중..." : "등록하기"}
                </button>
            </form>
        </div>
    );
};

export default CreateDebatePage;
