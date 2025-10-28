import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./CreateDebatePage.module.css";

const CreateDebatePage = () => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !content) return alert("제목과 내용을 모두 입력해주세요!");

        setLoading(true);
        try {
            await axios.post("http://localhost:8080/api/debates", {
                title,
                content,
                author: currentUser?.username || "익명",
                expBet: 50,
            });
            alert("✅ 새 토론이 등록되었습니다!");
            navigate("/board");
        } catch (err) {
            console.error(err);
            alert("토론 등록 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>📝 새 토론 만들기</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
                <label>제목</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="토론 제목을 입력하세요"
                    className={styles.input}
                />

                <label>내용</label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="토론 내용을 입력하세요"
                    className={styles.textarea}
                />

                <div className={styles.buttons}>
                    <button
                        type="button"
                        className={styles.back}
                        onClick={() => navigate("/board")}
                    >
                        ← 뒤로가기
                    </button>
                    <button
                        type="submit"
                        className={styles.submit}
                        disabled={loading}
                    >
                        {loading ? "등록 중..." : "등록하기"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateDebatePage;
