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
    const [selectedCategory, setSelectedCategory] = useState("전체");
    const categories = ["전체", "게임", "사회", "연애", "스포츠", "기타"];
    const [hoveredTab, setHoveredTab] = useState(null);
    // [ADD] 목록/상세 보기 모드 & 페이지네이션
    const [viewMode, setViewMode] = useState("list");        // 'list' | 'detail'
    const [selectedDebate, setSelectedDebate] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // 페이지당 10개 (원하면 나중에 UI로 변경 가능)
    const [searchTerm, setSearchTerm] = useState("");

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
    // ✅ 로그인 필요 기능 공통 가드

    const requireLogin = () => {
        if (!currentUser) {
            alert("⚠️ 로그인 후 이용해주세요.");
            return false;
        }
        return true;
    };




    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        if (savedUser) setCurrentUser(JSON.parse(savedUser));

        // 첫 로딩 시 데이터 가져오기
        fetchDebates();

        // 3초마다 주기적으로 갱신
        const interval = setInterval(() => {
            fetchDebates(false); // 👈 탭 상태 변경 방지용 인자
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const fetchDebates = async (shouldAutoSwitch = true) => {
        try {
            const res = await axios.get("http://192.168.0.21:8080/api/debates");
            const data = Array.isArray(res.data) ? res.data.reverse() : [];
            setDebates(data);

            // 👇 이 부분이 문제였을 가능성 높음
            if (shouldAutoSwitch) {
                // 자동 탭 전환 로직이 있다면 여기에 두기
                // (예: 특정 상태에서만 탭 이동)
            }

        } catch (err) {
            console.error("❌ 토론 데이터 불러오기 실패:", err);
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
        if (!requireLogin()) return;
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
        if (!requireLogin()) return;
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
        if (!requireLogin()) return;  // ✅ 추가

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
        if (!requireLogin()) return;
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
    const filteredDebates = debates.filter((d) => {
        const tabMatch =
            activeTab === "unrebutted"
                ? !d.rebuttalTitle && !d.isClosed
                : activeTab === "rebutted"
                    ? d.rebuttalTitle && !d.isClosed
                    : d.isClosed;

        const categoryMatch =
            selectedCategory === "전체" || d.category === selectedCategory;
        const searchMatch = d.title.toLowerCase().includes(searchTerm.toLowerCase());


        return tabMatch && categoryMatch && searchMatch;

    });

// ✅ 2️⃣ 페이지 나누기 (슬라이스)
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentDebates = filteredDebates.slice(indexOfFirst, indexOfLast);

    return (
        <div className={styles.container}>
            {/* ✅ 헤더 영역 */}
            <div className={styles.header}>
                <h1 className={styles.title}>🔥 토론의 전당</h1>

                <input
                    type="text"
                    placeholder="게시글 제목 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />
                {/* ✅ 로그인 상태에 따라 다른 버튼 표시 */}
                <div className={styles.userArea}>
                    {!currentUser ? (
                        // 로그인 안 되어 있으면 로그인 버튼만
                        <button
                            onClick={() => navigate("/login")}
                            className={styles.loginBtn}
                        >
                            로그인
                        </button>
                    ) : (
                        // 로그인 되어 있으면 사용자 정보 + 로그아웃 버튼
                        <>
                            <div className={styles.userInfo}>
                                <p
                                    className={styles.username}
                                    onClick={() => navigate("/mypage")}
                                    style={{ cursor: "pointer", textDecoration: "underline" }}
                                >
                                    {currentUser.username}
                                </p>
                                <p className={styles.exp}>EXP: {currentUser.exp}</p>
                            </div>
                            <button
                                onClick={() => {
                                    localStorage.removeItem("user");
                                    setCurrentUser(null);
                                    alert("로그아웃되었습니다.");
                                }}
                                className={styles.logoutBtn}
                            >
                                로그아웃
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ✅ 새 토론 등록 버튼 (로그인 필요) */}
            <button
                onClick={() => {
                    if (!requireLogin()) return; // 로그인 가드
                    navigate("/create");
                }}
                disabled={loading}
                className={styles.postButton}
            >
                ✏️ 새 토론 등록
            </button>

            {/* ✅ 탭 메뉴 */}
            {/* ✅ 탭 메뉴 (hover 드롭다운 포함) */}
            <div className={styles.tabContainer}>
                {/* 🗣️ 반박해보세요 */}
                <div
                    className={styles.tabWrapper}
                    onMouseEnter={() => setHoveredTab("unrebutted")}
                    onMouseLeave={() => setHoveredTab(null)}
                >
                    <button
                        className={`${styles.tabButton} ${
                            activeTab === "unrebutted" ? styles.activeTab : ""
                        }`}
                        onClick={() => {
                            setActiveTab("unrebutted");
                            setSelectedCategory("전체");
                            setCurrentPage(1);
                        }}
                    >
                        🗣️ 반박해보세요
                    </button>

                    {hoveredTab === "unrebutted" && (
                        <div className={styles.categoryDropdown}>
                            {["게임", "사회", "연애", "스포츠", "기타"].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => {
                                        setSelectedCategory(cat);
                                        setActiveTab("unrebutted");
                                        setCurrentPage(1);

                                    }}
                                    className={`${styles.categoryItem} ${
                                        selectedCategory === cat ? styles.activeCategory : ""
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ⚔️ 반박중 */}
                <div
                    className={styles.tabWrapper}
                    onMouseEnter={() => setHoveredTab("rebutted")}
                    onMouseLeave={() => setHoveredTab(null)}
                >
                    <button
                        className={`${styles.tabButton} ${
                            activeTab === "rebutted" ? styles.activeTab : ""
                        }`}
                        onClick={() => {
                            setActiveTab("rebutted");
                            setSelectedCategory("전체");
                            setCurrentPage(1);
                        }}
                    >
                        ⚔️ 반박중
                    </button>

                    {hoveredTab === "rebutted" && (
                        <div className={styles.categoryDropdown}>
                            {["게임", "사회", "연애", "스포츠", "기타"].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => {
                                        setSelectedCategory(cat);
                                        setActiveTab("rebutted");
                                        setCurrentPage(1);
                                    }}
                                    className={`${styles.categoryItem} ${
                                        selectedCategory === cat ? styles.activeCategory : ""
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 🕛 마감된 토론 */}
                <div
                    className={styles.tabWrapper}
                    onMouseEnter={() => setHoveredTab("closed")}
                    onMouseLeave={() => setHoveredTab(null)}
                >
                    <button
                        className={`${styles.tabButton} ${
                            activeTab === "closed" ? styles.activeTab : ""
                        }`}
                        onClick={() => {
                            setActiveTab("closed");
                            setSelectedCategory("전체");
                            setCurrentPage(1);
                        }}
                    >
                        🕛 마감된 토론
                    </button>

                    {hoveredTab === "closed" && (
                        <div className={styles.categoryDropdown}>
                            {["게임", "사회", "연애", "스포츠", "기타"].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => {
                                        setSelectedCategory(cat);
                                        setActiveTab("closed");
                                        setCurrentPage(1);
                                    }}
                                    className={`${styles.categoryItem} ${
                                        selectedCategory === cat ? styles.activeCategory : ""
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ✅ 나머지 토론/댓글 렌더링은 기존 그대로 */}
            {/* 👇 이하 부분은 수정하지 않아도 됨 (원본 유지) */}
            {/* ... 네가 올린 나머지 코드 그대로 둬 */}

            {/* 카테고리 필터 */}
            {activeTab !== "closed" && (
                <div className={styles.categoryFilter}>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`${styles.categoryBtn} ${selectedCategory === cat ? styles.activeCategory : ""}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}
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
                    {currentDebates.map((debate) => (
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

                                        {/* ✅ draw일 때 처리 추가 */}
                                        {debate.winner === "draw" ? (
                                            <p>🤝 무승부입니다!</p>
                                        ) : (
                                            <p>
                                                🏆 승자:{" "}
                                                {debate.winner === "author"
                                                    ? debate.author
                                                    : debate.rebuttalAuthor}
                                            </p>
                                        )}
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
            {/* ✅ 페이지네이션 */}
            <div className={styles.pagination}>
                {Array.from(
                    { length: Math.ceil(filteredDebates.length / itemsPerPage) },
                    (_, i) => i + 1
                ).map((page) => (
                    <button
                        key={page}
                        className={`${styles.pageBtn} ${
                            currentPage === page ? styles.activePage : ""
                        }`}
                        onClick={() => setCurrentPage(page)}
                    >
                        {page}
                    </button>
                ))}
            </div>
        </div>

    );
};

export default DebateBoard;
