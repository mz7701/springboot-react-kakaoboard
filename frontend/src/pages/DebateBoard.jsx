import React, { useEffect, useState } from "react";
import axios from "axios";
import { Trash2, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./DebateBoard.module.css";

axios.defaults.headers.post["Content-Type"] = "application/json";

const DebateBoard = () => {
    const [debates, setDebates] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [commentInputs, setCommentInputs] = useState({});
    const [rebuttalInputs, setRebuttalInputs] = useState({});
    const [showRebuttalInput, setShowRebuttalInput] = useState({});
    const [loading, setLoading] = useState(false);
    const [replyInputs, setReplyInputs] = useState({});
    const [showReplyInput, setShowReplyInput] = useState({});
    const [activeTab, setActiveTab] = useState("unrebutted");
    const navigate = useNavigate();

    // ✅ 남은시간 계산 함수
    const getRemainingTime = (debate) => {
        if (!debate.rebuttalAt || debate.isClosed) return null;

        const rebuttalTime = new Date(debate.rebuttalAt);
        const now = new Date();
        const diffMs = rebuttalTime.getTime() + 12 * 60 * 60 * 1000 - now.getTime(); // 12시간 기준

        if (diffMs <= 0) return "⏰ 마감된 토론";

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}시간 ${minutes}분 남음`;
    };

    // ✅ 데이터 주기적 갱신
    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        if (savedUser) setCurrentUser(JSON.parse(savedUser));

        fetchDebates();
        const interval = setInterval(fetchDebates, 3000);
        return () => clearInterval(interval);
    }, []);

    const fetchDebates = async () => {
        try {
            const res = await axios.get("http://192.168.0.21:8080/api/debates");
            const data = Array.isArray(res.data) ? res.data.reverse() : [];
            setDebates(data);

            // ✅ 마감된 토론이 새로 생겼을 경우 자동 이동
            if (data.some(d => d.isClosed) && activeTab !== "closed") {
                setActiveTab("closed");
            }
        } catch (err) {
            console.error("토론 불러오기 실패:", err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("정말 삭제하시겠습니까?")) return;
        try {
            await axios.delete(`http://192.168.0.21:8080/api/debates/${id}`);
            alert("🗑️ 삭제되었습니다.");
            fetchDebates();
        } catch (err) {
            console.error("삭제 실패:", err);
            alert("삭제 중 오류 발생");
        }
    };

    const handleRebuttalSubmit = async (debateId) => {
        const input = rebuttalInputs[debateId];
        if (!input?.title || !input?.content) return alert("제목과 내용을 입력하세요!");

        try {
            await axios.post(`http://192.168.0.21:8080/api/debates/${debateId}/rebuttal`, {
                title: input.title,
                content: input.content,
                author: currentUser?.username || "익명",
            });
            alert("반박이 등록되었습니다!");
            setShowRebuttalInput({ ...showRebuttalInput, [debateId]: false });
            fetchDebates();
        } catch (err) {
            console.error("반박 등록 실패:", err);
        }
    };

    const handleVote = async (debateId, type) => {
        try {
            await axios.post(`http://192.168.0.21:8080/api/debates/${debateId}/vote`, {
                type,
                voter: currentUser?.username,
            });
            alert("✅ 투표가 완료되었습니다!");
            fetchDebates();
        } catch (err) {
            console.error("투표 실패:", err);
            const msg = err.response?.data?.message || err.response?.data || "서버 오류로 투표 실패";
            alert(typeof msg === "string" ? msg : JSON.stringify(msg));
        }
    };

    const handleCommentChange = (debateId, text) => {
        setCommentInputs({ ...commentInputs, [debateId]: text });
    };

    const handleCommentSubmit = async (debateId) => {
        const text = commentInputs[debateId];
        if (!text || !text.trim()) return alert("댓글을 입력하세요!");
        try {
            await axios.post(`http://192.168.0.21:8080/api/debates/${debateId}/comments`, {
                author: currentUser?.username || "익명",
                text,
            });
            setCommentInputs({ ...commentInputs, [debateId]: "" });
            fetchDebates();
        } catch (err) {
            console.error("댓글 등록 실패:", err);
        }
    };

    const handleReplySubmit = async (debateId, parentId) => {
        const text = replyInputs[parentId];
        if (!text || !text.trim()) return alert("대댓글을 입력하세요!");

        try {
            await axios.post(
                `http://192.168.0.21:8080/api/debates/${debateId}/comments/${parentId}/reply`,
                {
                    author: currentUser?.username || "익명",
                    text,
                }
            );
            setReplyInputs({ ...replyInputs, [parentId]: "" });
            await fetchDebates();
        } catch (err) {
            console.error("대댓글 등록 실패:", err);
        }
    };

    const filteredDebates =
        activeTab === "unrebutted"
            ? debates.filter((d) => !d.rebuttalTitle && !d.isClosed)
            : activeTab === "rebutted"
                ? debates.filter((d) => (d.rebuttalAuthor || d.rebuttalContent) && !d.isClosed)
                : debates.filter((d) => d.isClosed);

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

            {/* ✅ 탭 메뉴 */}
            <div className={styles.tabContainer}>
                <button
                    className={`${styles.tabButton} ${activeTab === "unrebutted" ? styles.activeTab : ""}`}
                    onClick={() => setActiveTab("unrebutted")}
                >
                    🗣️ 반박해보세요
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === "rebutted" ? styles.activeTab : ""}`}
                    onClick={() => setActiveTab("rebutted")}
                >
                    ⚔️ 반박중
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === "closed" ? styles.activeTab : ""}`}
                    onClick={() => setActiveTab("closed")}
                >
                    🕛 마감된 토론
                </button>
            </div>

            {/* ✅ 토론 목록 */}
            {filteredDebates.length === 0 ? (
                <p style={{ textAlign: "center", color: "#888", marginTop: "2rem" }}>
                    {activeTab === "unrebutted"
                        ? "반박 가능한 토론이 없습니다."
                        : activeTab === "rebutted"
                            ? "현재 반박 중인 토론이 없습니다."
                            : "마감된 토론이 없습니다."}
                </p>
            ) : (
                <div className={styles.debateList}>
                    {filteredDebates.map((debate) => (
                        <div key={debate.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}>{debate.title}</h2>
                                {currentUser?.username === debate.author && (
                                    <button
                                        onClick={() => handleDelete(debate.id)}
                                        className={styles.deleteButton}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            <p className={styles.cardContent}>{debate.content}</p>

                            {/* ✅ 반박하기 */}
                            {activeTab === "unrebutted" && (
                                <div className={styles.rebuttalArea}>
                                    {debate.author !== currentUser?.username && (
                                        !showRebuttalInput[debate.id] ? (
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
                                                <button
                                                    onClick={() =>
                                                        setShowRebuttalInput({
                                                            ...showRebuttalInput,
                                                            [debate.id]: false,
                                                        })
                                                    }
                                                    className={styles.rebuttalCloseBtn}
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
                                        )
                                    )}
                                </div>
                            )}

                            {/* ✅ 반박중 (투표) */}
                            {activeTab === "rebutted" && (
                                <>
                                    {debate.rebuttalAt && !debate.isClosed && (
                                        <p style={{ textAlign: "right", fontWeight: 600 }}>
                                            🕒 {getRemainingTime(debate)}
                                        </p>
                                    )}

                                    <div className={styles.rebuttalBox}>
                                        <h4>🗣️ {debate.rebuttalTitle}</h4>
                                        <p>{debate.rebuttalContent}</p>
                                        <p className={styles.rebuttalMeta}>- {debate.rebuttalAuthor}</p>
                                    </div>

                                    <div className={styles.voteSection}>
                                        <button
                                            disabled={
                                                debate.isClosed ||
                                                currentUser?.username === debate.author ||
                                                currentUser?.username === debate.rebuttalAuthor
                                            }
                                            onClick={() => handleVote(debate.id, "author")}
                                            className={styles.voteButton}
                                        >
                                            {debate.author} ({debate.authorVotes})
                                        </button>

                                        <span className={styles.vs}>VS</span>

                                        <button
                                            disabled={
                                                debate.isClosed ||
                                                currentUser?.username === debate.author ||
                                                currentUser?.username === debate.rebuttalAuthor
                                            }
                                            onClick={() => handleVote(debate.id, "rebuttal")}
                                            className={styles.voteButton}
                                        >
                                            {debate.rebuttalAuthor} ({debate.rebuttalVotes})
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* ✅ 마감된 토론 */}
                            {activeTab === "closed" && (
                                <>
                                    <div className={styles.rebuttalBox}>
                                        <h4>🗣️ {debate.rebuttalTitle}</h4>
                                        <p>{debate.rebuttalContent}</p>
                                        <p className={styles.rebuttalMeta}>- {debate.rebuttalAuthor}</p>
                                    </div>
                                    <div className={styles.closedSection}>
                                        <h4>🕛 마감된 토론</h4>
                                        <p>
                                            🏆 승자:{" "}
                                            {debate.authorVotes > debate.rebuttalVotes
                                                ? debate.author
                                                : debate.rebuttalAuthor}
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* ✅ 댓글 */}
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

                                            <button
                                                onClick={() =>
                                                    setShowReplyInput({
                                                        ...showReplyInput,
                                                        [c.id]: !showReplyInput[c.id],
                                                    })
                                                }
                                                className={styles.replyButton}
                                            >
                                                💬 답글
                                            </button>

                                            {showReplyInput[c.id] && (
                                                <div className={styles.replyInputGroup}>
                                                    <input
                                                        type="text"
                                                        placeholder="답글을 입력하세요..."
                                                        value={replyInputs[c.id] || ""}
                                                        onChange={(e) =>
                                                            setReplyInputs({
                                                                ...replyInputs,
                                                                [c.id]: e.target.value,
                                                            })
                                                        }
                                                        className={styles.replyInput}
                                                    />
                                                    <button
                                                        onClick={() => handleReplySubmit(debate.id, c.id)}
                                                        className={styles.replySubmit}
                                                    >
                                                        등록
                                                    </button>
                                                </div>
                                            )}

                                            {c.replies?.map((r) => (
                                                <div key={r.id} className={styles.replyItem}>
                                                    <span className={styles.replyAuthor}>
                                                        ↳ {r.author}:
                                                    </span>{" "}
                                                    {r.text}
                                                </div>
                                            ))}
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
