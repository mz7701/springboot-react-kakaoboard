import React, { useEffect, useState } from "react";
import axios from "axios";
import { Trash2, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./DebateBoard.module.css";

axios.defaults.baseURL = "http://192.168.0.189:8080";

// 색상 랜덤 - 작성자별 고정 색
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash) % 360}, 70%, 50%)`;
}

export default function DebateBoard({ selectedCategory }) {
    const navigate = useNavigate();

    const [debates, setDebates] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    const [activeTab, setActiveTab] = useState("unrebutted");
    const [expandedDebateId, setExpandedDebateId] = useState(null);

    const [comments, setComments] = useState({});
    const [commentInputs, setCommentInputs] = useState({});
    const [replyTargets, setReplyTargets] = useState({});
    const [showRebuttalInput, setShowRebuttalInput] = useState({});
    const [rebuttalInputs, setRebuttalInputs] = useState({});

    const [searchTerm, setSearchTerm] = useState("");
    const itemsPerPage = 10;
    const [currentPage, setCurrentPage] = useState(1);

    /* --------------------- 데이터 로딩 --------------------- */
    useEffect(() => {
        const saved = localStorage.getItem("user");
        if (saved) setCurrentUser(JSON.parse(saved));

        fetchDebates();

        const interval = setInterval(() => {
            fetchDebates();
            if (expandedDebateId) fetchComments(expandedDebateId);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const fetchDebates = async () => {
        try {
            const res = await axios.get("/api/debates");
            const data = Array.isArray(res.data) ? res.data.reverse() : [];
            setDebates(data);
        } catch (err) {
            console.error("불러오기 실패:", err);
        }
    };

    const fetchComments = async (debateId) => {
        try {
            const res = await axios.get(`/api/debates/${debateId}/comments/tree`);
            setComments((prev) => ({ ...prev, [debateId]: res.data }));
        } catch (err) {
            console.error("댓글 실패:", err);
        }
    };

    /* --------------------- 공통 가드 --------------------- */
    const requireLogin = () => {
        if (!currentUser) {
            alert("로그인이 필요합니다");
            return false;
        }
        return true;
    };

    /* --------------------- 삭제 --------------------- */
    const handleDelete = async (id) => {
        if (!window.confirm("삭제하시겠습니까?")) return;
        await axios.delete(`/api/debates/${id}`);
        fetchDebates();
    };

    /* --------------------- 댓글 등록 --------------------- */
    const handleCommentSubmit = async (debateId) => {
        if (!requireLogin()) return;

        const text = commentInputs[debateId];
        if (!text || text.trim() === "") {
            alert("댓글을 입력하세요!");
            return;
        }

        const target = replyTargets[debateId];

        try {
            if (target) {
                await axios.post(
                    `/api/debates/${debateId}/comments/${target.id}/reply`,
                    {
                        author: currentUser.username,
                        text,
                    }
                );
            } else {
                await axios.post(`/api/debates/${debateId}/comments`, {
                    author: currentUser.username,
                    text,
                });
            }

            setCommentInputs({ ...commentInputs, [debateId]: "" });
            setReplyTargets({ ...replyTargets, [debateId]: null });

            fetchComments(debateId);
        } catch (err) {
            console.error("댓글 등록 실패:", err);
        }
    };

    /* --------------------- 댓글 삭제 --------------------- */
    const handleCommentDelete = async (debateId, comment) => {
        if (!requireLogin()) return;
        if (currentUser.username !== comment.author)
            return alert("본인 댓글만 삭제할 수 있습니다.");

        if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

        await axios.delete(`/api/debates/${debateId}/comments/${comment.id}`);
        fetchComments(debateId);
    };

    /* --------------------- 반박하기 --------------------- */
    const handleRebuttalSubmit = async (debateId) => {
        if (!requireLogin()) return;

        const data = rebuttalInputs[debateId];
        if (!data?.title || !data?.content)
            return alert("제목/내용을 입력하세요!");

        await axios.post(`/api/debates/${debateId}/rebuttal`, {
            title: data.title,
            content: data.content,
            author: currentUser.username,
        });

        setShowRebuttalInput({ ...showRebuttalInput, [debateId]: false });
        fetchDebates();
    };

    /* --------------------- 투표 --------------------- */
    const handleVote = async (debateId, type) => {
        if (!requireLogin()) return;

        try {
            await axios.post(`/api/debates/${debateId}/vote`, {
                type,
                voter: currentUser.username,
            });
        } catch (err) {
            console.error(err);
            alert(err.response?.data || "투표 실패");
        }

        fetchDebates();
    };

    /* --------------------- 남은시간 --------------------- */
    const getRemainingTime = (debate) => {
        if (!debate.rebuttalAt || debate.isClosed) return null;

        const rebuttalTime = new Date(debate.rebuttalAt);
        const now = new Date();
        const diffMs =
            rebuttalTime.getTime() + 12 * 60 * 60 * 1000 - now.getTime();

        if (diffMs <= 0) return "⏰ 마감된 토론";

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}시간 ${minutes}분 남음`;
    };

    /* --------------------- 필터링 --------------------- */
    const filteredDebates = debates.filter((d) => {
        const tabMatch =
            activeTab === "unrebutted"
                ? !d.rebuttalTitle && !d.isClosed
                : activeTab === "rebutted"
                    ? d.rebuttalTitle && !d.isClosed
                    : d.isClosed;

        const categoryMatch =
            selectedCategory === "전체" || d.category === selectedCategory;

        const searchMatch =
            d.title?.toLowerCase().includes(searchTerm.toLowerCase());

        return tabMatch && categoryMatch && searchMatch;
    });

    const indexOfLast = currentPage * itemsPerPage;
    const currentDebates = filteredDebates.slice(
        indexOfLast - itemsPerPage,
        indexOfLast
    );

    /* --------------------- 댓글 렌더 --------------------- */
    const renderComments = (debateId, list, depth = 0) => {
        if (!list) return null;

        return list.map((c) => (
            <div
                key={c.id}
                className={`${styles.commentRow} ${
                    depth > 0 ? styles.childRow : ""
                }`}
            >
                <div className={styles.commentHeaderLine}>
                    <span
                        className={styles.author}
                        style={{ color: stringToColor(c.author) }}
                        onClick={() => {
                            if (!requireLogin()) return;
                            setReplyTargets({
                                ...replyTargets,
                                [debateId]: { id: c.id, author: c.author },
                            });

                            setCommentInputs({
                                ...commentInputs,
                                [debateId]: `@${c.author} `,
                            });
                        }}
                    >
                        {c.author}
                    </span>

                    {currentUser?.username === c.author && (
                        <button
                            className={styles.commentDelete}
                            onClick={() => handleCommentDelete(debateId, c)}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>

                <span className={styles.commentText}>{c.text}</span>

                {c.replies?.length > 0 &&
                    renderComments(debateId, c.replies, depth + 1)}
            </div>
        ));
    };

    /* --------------------- JSX 출력 --------------------- */
    return (
        <div className={styles.container}>

            {/* 탭 */}
            <div className={styles.tabRow}>
                {["unrebutted", "rebutted", "closed"].map((tab) => (
                    <button
                        key={tab}
                        className={`${styles.tabBtn} ${
                            activeTab === tab ? styles.activeTab : ""
                        }`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === "unrebutted"
                            ? "🗣️ 반박해보세요"
                            : tab === "rebutted"
                                ? "⚔️ 반박중"
                                : "🕛 마감된 토론"}
                    </button>
                ))}
            </div>

            {/* 버튼 줄 */}
            <div className={styles.buttonRow}>
                <button
                    className={styles.newPostBtn}
                    onClick={() => {
                        if (!requireLogin()) return;
                        navigate("/create");
                    }}
                >
                    ✏ 새 토론 등록
                </button>

                <button
                    className={styles.chatBtn}
                    onClick={() => navigate("/chatroom")}
                >
                    💬 실시간 토론장 입장하기
                </button>
            </div>

            {/* 목록 */}
            <div className={styles.list}>
                {currentDebates.map((debate) => (
                    <div key={debate.id} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3
                                className={styles.title}
                                onClick={() => {
                                    const id =
                                        expandedDebateId === debate.id
                                            ? null
                                            : debate.id;
                                    setExpandedDebateId(id);
                                    if (id) fetchComments(debate.id);
                                }}
                            >
                                {debate.title}
                            </h3>

                            {currentUser?.username === debate.author && (
                                <button
                                    className={styles.delBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(debate.id);
                                    }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>

                        {/* 펼쳐진 카드 */}
                        {expandedDebateId === debate.id && (
                            <>
                                <p className={styles.content}>
                                    {debate.content}
                                </p>

                                {/* 반박하기 */}
                                {activeTab === "unrebutted" &&
                                    currentUser?.username !== debate.author && (
                                        <div className={styles.rebuttalArea}>
                                            {!showRebuttalInput[debate.id] ? (
                                                <button
                                                    className={styles.rebuttalBtn}
                                                    onClick={() =>
                                                        setShowRebuttalInput({
                                                            ...showRebuttalInput,
                                                            [debate.id]: true,
                                                        })
                                                    }
                                                >
                                                    🗣️ 토론 반박하기
                                                </button>
                                            ) : (
                                                <div className={styles.rebuttalForm}>
                                                    <input
                                                        type="text"
                                                        placeholder="반박 제목"
                                                        value={
                                                            rebuttalInputs[debate.id]?.title ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            setRebuttalInputs({
                                                                ...rebuttalInputs,
                                                                [debate.id]: {
                                                                    ...rebuttalInputs[debate.id],
                                                                    title: e.target.value,
                                                                },
                                                            })
                                                        }
                                                    />

                                                    <textarea
                                                        placeholder="반박 내용"
                                                        value={
                                                            rebuttalInputs[debate.id]?.content ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            setRebuttalInputs({
                                                                ...rebuttalInputs,
                                                                [debate.id]: {
                                                                    ...rebuttalInputs[debate.id],
                                                                    content:
                                                                    e.target.value,
                                                                },
                                                            })
                                                        }
                                                    />

                                                    <button
                                                        className={styles.rebuttalSubmit}
                                                        onClick={() =>
                                                            handleRebuttalSubmit(
                                                                debate.id
                                                            )
                                                        }
                                                    >
                                                        등록
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                {/* 반박중 (투표) */}
                                {activeTab === "rebutted" && (
                                    <div className={styles.voteBox}>
                                        {debate.rebuttalAt &&
                                            !debate.isClosed && (
                                                <p className={styles.timer}>
                                                    🕒 {getRemainingTime(debate)}
                                                </p>
                                            )}

                                        <h4>{debate.rebuttalTitle}</h4>
                                        <p>{debate.rebuttalContent}</p>

                                        <div className={styles.voteSection}>
                                            <button
                                                onClick={() =>
                                                    handleVote(
                                                        debate.id,
                                                        "author"
                                                    )
                                                }
                                            >
                                                {debate.author}(
                                                {debate.authorVotes})
                                            </button>

                                            <span className={styles.vs}>
                                                VS
                                            </span>

                                            <button
                                                onClick={() =>
                                                    handleVote(
                                                        debate.id,
                                                        "rebuttal"
                                                    )
                                                }
                                            >
                                                {debate.rebuttalAuthor}(
                                                {debate.rebuttalVotes})
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* 댓글 */}
                                <div className={styles.commentBox}>
                                    <h4 className={styles.commentTitle}>
                                        <MessageSquare size={16} /> 댓글 (
                                        {comments[debate.id]?.length || 0})
                                    </h4>

                                    <div className={styles.commentList}>
                                        {renderComments(
                                            debate.id,
                                            comments[debate.id]
                                        )}
                                    </div>

                                    {currentUser && (
                                        <div className={styles.commentInputBox}>
                                            <input
                                                value={
                                                    commentInputs[debate.id] ||
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    setCommentInputs({
                                                        ...commentInputs,
                                                        [debate.id]:
                                                        e.target.value,
                                                    })
                                                }
                                                placeholder="댓글을 입력하세요..."
                                            />

                                            <button
                                                className={
                                                    styles.commentSubmit
                                                }
                                                onClick={() =>
                                                    handleCommentSubmit(
                                                        debate.id
                                                    )
                                                }
                                            >
                                                등록
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
