import React, { useEffect, useState } from "react";
import axios from "axios";
import { ThumbsUp, ThumbsDown, MessageSquare, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./DebateBoard.module.css";

const DebateBoard = () => {
    const [debates, setDebates] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [commentInputs, setCommentInputs] = useState({});
    const [rebuttalInputs, setRebuttalInputs] = useState({});
    const [showRebuttalInput, setShowRebuttalInput] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        if (savedUser) setCurrentUser(JSON.parse(savedUser));

        fetchDebates();
        const interval = setInterval(fetchDebates, 3000);
        return () => clearInterval(interval);
    }, []);

    const fetchDebates = async () => {
        try {
            const res = await axios.get("http://localhost:8080/api/debates");
            setDebates(Array.isArray(res.data) ? res.data.reverse() : []);
        } catch (err) {
            console.error("토론 불러오기 실패:", err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("정말 삭제하시겠습니까?")) return;
        try {
            await axios.delete(`http://localhost:8080/api/debates/${id}`);
            alert("🗑️ 삭제되었습니다.");
            fetchDebates();
        } catch (err) {
            console.error("삭제 실패:", err);
            alert("삭제 중 오류가 발생했습니다.");
        }
    };

    const handleLike = async (id) => {
        await axios.post(`http://localhost:8080/api/debates/${id}/like`);
        fetchDebates();
    };

    const handleDislike = async (id) => {
        await axios.post(`http://localhost:8080/api/debates/${id}/dislike`);
        fetchDebates();
    };

    const handleCommentChange = (debateId, text) => {
        setCommentInputs({ ...commentInputs, [debateId]: text });
    };

    const handleCommentSubmit = async (debateId) => {
        const text = commentInputs[debateId];
        if (!text || !text.trim()) return alert("댓글을 입력하세요!");

        try {
            await axios.post(`http://localhost:8080/api/debates/${debateId}/comments`, {
                author: currentUser?.username || "익명",
                text,
            });
            setCommentInputs({ ...commentInputs, [debateId]: "" });
            fetchDebates();
        } catch (err) {
            console.error("댓글 등록 실패:", err);
        }
    };

    // ✅ 반박 등록 함수
    const handleRebuttalSubmit = async (debateId) => {
        const input = rebuttalInputs[debateId];
        if (!input?.title || !input?.content) return alert("제목과 내용을 입력하세요!");

        try {
            await axios.post(`http://localhost:8080/api/debates/${debateId}/rebuttal`, {
                title: input.title,
                content: input.content,
                author: currentUser?.username || "익명",
            });
            alert("반박이 등록되었습니다!");
            setShowRebuttalInput({ ...showRebuttalInput, [debateId]: false });
            fetchDebates();
        } catch (err) {
            console.error("반박 등록 실패:", err);
            alert("반박 등록 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>🔥 토론의 전당</h1>
                {currentUser && (
                    <div className={styles.userInfo}>
                        <p className={styles.username}>{currentUser.username}</p>
                        <p className={styles.exp}>EXP: {currentUser.exp}</p>
                    </div>
                )}
            </div>

            {currentUser && (
                <button
                    onClick={() => navigate("/create")}
                    disabled={loading}
                    className={styles.postButton}
                >
                    ✏️ 새 토론 등록
                </button>
            )}

            {debates.length === 0 ? (
                <p style={{ textAlign: "center", color: "#888", marginTop: "2rem" }}>
                    아직 등록된 토론이 없습니다.
                </p>
            ) : (
                <div className={styles.debateList}>
                    {debates.map((debate) => (
                        <div key={debate.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}>{debate.title}</h2>
                                {currentUser?.username === debate.author && (
                                    <button
                                        onClick={() => handleDelete(debate.id)}
                                        className={styles.deleteButton}
                                        title="삭제하기"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            <p className={styles.cardContent}>{debate.content}</p>
                            <p className={styles.cardMeta}>
                                👤 {debate.author} | 🕒{" "}
                                {new Date(debate.createdAt).toLocaleString()}
                            </p>

                            <div className={styles.actions}>
                                <button
                                    onClick={() => handleLike(debate.id)}
                                    className={`${styles.actionButton} ${styles.like}`}
                                >
                                    <ThumbsUp className="w-4 h-4" /> {debate.likes}
                                </button>
                                <button
                                    onClick={() => handleDislike(debate.id)}
                                    className={`${styles.actionButton} ${styles.dislike}`}
                                >
                                    <ThumbsDown className="w-4 h-4" /> {debate.dislikes}
                                </button>
                            </div>

                            {/* ✅ 반박 표시 영역 */}
                            {debate.rebuttalTitle ? (
                                <div className={styles.rebuttalBox}>
                                    <h4>🗣️ {debate.rebuttalTitle}</h4>
                                    <p>{debate.rebuttalContent}</p>
                                    <p className={styles.rebuttalMeta}>- {debate.rebuttalAuthor}</p>
                                </div>
                            ) : (
                                currentUser &&
                                currentUser.username !== debate.author && (
                                    <div className={styles.rebuttalArea}>
                                        {!showRebuttalInput[debate.id] ? (
                                            <button
                                                onClick={() =>
                                                    setShowRebuttalInput({
                                                        ...showRebuttalInput,
                                                        [debate.id]: true,
                                                    })
                                                }
                                                className={styles.rebuttalButton}
                                            >
                                                🗣️ 토론 반박하기
                                            </button>
                                        ) : (
                                            <div className={styles.rebuttalForm}>
                                                {/* ❌ 닫기 버튼 */}
                                                <button
                                                    onClick={() =>
                                                        setShowRebuttalInput({
                                                            ...showRebuttalInput,
                                                            [debate.id]: false,
                                                        })
                                                    }
                                                    className={styles.rebuttalCloseBtn}
                                                    title="닫기"
                                                >
                                                    ❌
                                                </button>

                                                <input
                                                    type="text"
                                                    placeholder="반박 제목"
                                                    value={rebuttalInputs[debate.id]?.title || ""}
                                                    onChange={(e) =>
                                                        setRebuttalInputs({
                                                            ...rebuttalInputs,
                                                            [debate.id]: {
                                                                ...rebuttalInputs[debate.id],
                                                                title: e.target.value,
                                                            },
                                                        })
                                                    }
                                                    className={styles.rebuttalInput}
                                                />
                                                <textarea
                                                    placeholder="반박 내용을 입력해주세요"
                                                    value={rebuttalInputs[debate.id]?.content || ""}
                                                    onChange={(e) =>
                                                        setRebuttalInputs({
                                                            ...rebuttalInputs,
                                                            [debate.id]: {
                                                                ...rebuttalInputs[debate.id],
                                                                content: e.target.value,
                                                            },
                                                        })
                                                    }
                                                    className={styles.rebuttalTextarea}
                                                />
                                                <button
                                                    onClick={() => handleRebuttalSubmit(debate.id)}
                                                    className={styles.rebuttalSubmit}
                                                >
                                                    등록
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            )}

                            {/* ✅ 댓글 영역 기존 그대로 */}
                            <div className={styles.commentSection}>
                                <h3 className={styles.commentTitle}>
                                    <MessageSquare className="w-4 h-4" /> 댓글 (
                                    {debate.comments?.length || 0})
                                </h3>

                                <div className={styles.commentList}>
                                    {debate.comments?.map((c) => (
                                        <div key={c.id} className={styles.commentItem}>
                                            <span className={styles.commentAuthor}>{c.author}:</span>{" "}
                                            {c.text}
                                        </div>
                                    ))}
                                </div>

                                {currentUser && (
                                    <div className={styles.commentInputGroup}>
                                        <input
                                            value={commentInputs[debate.id] || ""}
                                            onChange={(e) =>
                                                handleCommentChange(debate.id, e.target.value)
                                            }
                                            placeholder="댓글을 입력하세요..."
                                            className={styles.commentInput}
                                        />
                                        <button
                                            onClick={() => handleCommentSubmit(debate.id)}
                                            className={styles.commentSubmit}
                                        >
                                            등록
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DebateBoard;
