
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Trash2, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./DebateBoard.module.css";
import { API_BASE_URL } from "../api/baseURL";   // 경로는 파일 위치에 따라 ../ 또는 ../../

axios.defaults.baseURL = API_BASE_URL;

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash) % 360}, 70%, 50%)`;
}



const DebateBoard = () => {
    const [debates, setDebates] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [commentInputs, setCommentInputs] = useState({});
    const [rebuttalInputs, setRebuttalInputs] = useState({});
    const [showRebuttalInput, setShowRebuttalInput] = useState({});
    const [loading, setLoading] = useState(false);
// ✅ 어떤 댓글에 답글 쓰는지 저장 (디시 스타일)
    const [replyTargets, setReplyTargets] = useState({});

    const [activeTab, setActiveTab] = useState("unrebutted");
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState("전체");
    const categories = ["전체", "게임", "사회", "연애", "스포츠", "기타"];
    const [hoveredTab, setHoveredTab] = useState(null);
    // [ADD] 목록/상세 보기 모드 & 페이지네이션
    const [viewMode, setViewMode] = useState("list"); // 'list' | 'detail'
    const [selectedDebate, setSelectedDebate] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // 페이지당 10개 (원하면 나중에 UI로 변경 가능)
    const [searchTerm, setSearchTerm] = useState("");
    const [currentTab, setCurrentTab] = useState("all");
    const [comments, setComments] = useState({});
    // ✅ 제목 클릭 시 펼침/접힘 토글용 (추가)
    const [expandedDebateId, setExpandedDebateId] = useState(null);

    const MAX_COMMENT_INDENT = 4;

    const DEADLINE_HOURS = 12;
    const KOREA_OFFSET_HOURS = 9; // 서버(UTC)와 한국 시차
    useEffect(() => {
        fetchDebates();
    }, []);

    const getRemainingTime = (debate) => {
        if (!debate.rebuttalAt || debate.isClosed) return null;

        const rebuttalTime = new Date(debate.rebuttalAt);
        const now = new Date();

        const diffMs =
            rebuttalTime.getTime() +
            (DEADLINE_HOURS + KOREA_OFFSET_HOURS) * 60 * 60 * 1000 -
            now.getTime();

        if (diffMs <= 0) return "⏰ 마감된 토론";

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor(
            (diffMs % (1000 * 60 * 60)) / (1000 * 60)
        );
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
            fetchDebates(false);
            if (expandedDebateId) {
                fetchComments(expandedDebateId); // ✅ 펼쳐진 카드의 댓글 트리도 최신화
            }// 👈 탭 상태 변경 방지용 인자
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const fetchDebates = async (shouldAutoSwitch = true) => {
        try {
            const res = await axios.get("/api/debates");
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
    const fetchComments = async (debateId) => {
        try {
            const res = await axios.get(`/api/debates/${debateId}/comments`);
            // res.data 가 [ { id, text, author, replies: [...] }, ... ] 형태라고 가정
            setComments((prev) => ({
                ...prev,
                [debateId]: res.data,
            }));
        } catch (err) {
            console.error("❌ 댓글 불러오기 실패:", err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("정말 삭제하시겠습니까?")) return;
        try {
            await axios.delete(`/api/debates/${id}`);
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
            await axios.post(`/api/debates/${debateId}/rebuttal`, {
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
            await axios.post(`/api/debates/${debateId}/vote`, {
                type,
                voter: currentUser?.username,
            });
            alert("✅ 투표가 완료되었습니다!");
            fetchDebates();
        } catch (err) {
            console.error("투표 실패:", err);
            const msg =
                err.response?.data?.message ||
                err.response?.data ||
                "서버 오류로 투표 실패";
            alert(typeof msg === "string" ? msg : JSON.stringify(msg));
        }
    };

    // ✅ 댓글 입력 내용 변경 (디시 스타일 멘션 보호)
    const handleCommentChange = (debateId, value) => {
        const target = replyTargets[debateId]; // { id, author } | undefined

        if (target) {
            const prefix = `@${target.author} `;

            // 🔒 멘션 모드인데, 입력값이 prefix로 시작 안 하면 = 멘션을 건드린 것
            if (!value.startsWith(prefix)) {
                // 맨 앞 단어(@닉 or 닉네임) 통째로 제거해서 일반 댓글로 전환
                const bodyOnly = value.replace(/^@?\S+\s*/, "");
                setReplyTargets((prev) => ({
                    ...prev,
                    [debateId]: undefined,      // 멘션 모드 해제
                }));
                setCommentInputs((prev) => ({
                    ...prev,
                    [debateId]: bodyOnly,       // 멘션 날리고 본문만 남김
                }));
                return;
            }
        }

        // 멘션은 유지되고, 뒤에 내용만 수정하는 경우
        setCommentInputs((prev) => ({
            ...prev,
            [debateId]: value,
        }));
    };


    // ✅ 댓글/대댓글 등록
    const handleCommentSubmit = async (debateId) => {
        if (!requireLogin()) return;

        const raw = (commentInputs[debateId] || "").trim();
        if (!raw) {
            alert("댓글을 입력하세요!");
            return;
        }

        const target = replyTargets[debateId]; // { id, author } | undefined
        const isReply = !!target;
        let finalText = raw;

        if (isReply) {
            const prefix = `@${target.author} `;
            if (!raw.startsWith(prefix)) {
                // 혹시라도 앞부분이 꼬였으면 그냥 일반 댓글로 처리
                finalText = raw;
            }
        }

        try {
            if (isReply) {
                // ✅ 여기! 특정 댓글의 대댓글로 전송
                await axios.post(
                    `/api/debates/${debateId}/comments/${target.id}/reply`,
                    {
                        author: currentUser?.username || "익명",
                        text: finalText,
                    }
                );
            } else {
                // 일반 댓글
                await axios.post(`/api/debates/${debateId}/comments`, {
                    author: currentUser?.username || "익명",
                    text: finalText,
                });
            }

            // 입력값 + 타겟 초기화
            setCommentInputs((prev) => ({ ...prev, [debateId]: "" }));
            setReplyTargets((prev) => ({ ...prev, [debateId]: undefined }));

            await fetchComments(debateId);
            fetchDebates();
        } catch (err) {
            console.error("댓글 등록 실패:", err);
            alert("댓글 등록 중 오류가 발생했습니다.");
        }
    };

    // ✨ 댓글 삭제 (본인 것만)
    const handleCommentDelete = async (debateId, comment) => {
        if (!requireLogin()) return;

        if (currentUser?.username !== comment.author) {
            alert("자신이 작성한 댓글만 삭제할 수 있습니다.");
            return;
        }

        if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

        try {
            // ⚠️ 백엔드에 DELETE /api/debates/{debateId}/comments/{commentId} 구현 필요
            await axios.delete(`/api/debates/${debateId}/comments/${comment.id}`);
            await fetchComments(debateId);
            await fetchDebates();
        } catch (err) {
            console.error("댓글 삭제 실패:", err);
            alert(err.response?.data || "댓글 삭제 중 오류가 발생했습니다.");
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
        const searchMatch = d.title
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase());

        return tabMatch && categoryMatch && searchMatch;
    });

    // ✅ 2️⃣ 페이지 나누기 (슬라이스)
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentDebates = filteredDebates.slice(indexOfFirst, indexOfLast);

    const renderComments = (debateId, comments, depth = 0) => {
        if (!Array.isArray(comments) || comments.length === 0) return null;

        const uniqueComments = Array.from(
            new Map(comments.map((c) => [c.id, c])).values()
        );

        return uniqueComments.map((c) => {
            const author = c.author || "익명";
            const isReply = depth > 0;

            // 🔹 서버에 저장된 원본 텍스트
            const rawText = c.text || "";
            let mentionNick = null;
            let contentText = rawText;

            // "@닉네임 내용" 형태면 멘션/본문 분리
            const mentionMatch = rawText.match(/^@(\S+)\s+(.*)$/);
            if (mentionMatch) {
                mentionNick = mentionMatch[1];
                contentText = mentionMatch[2] || "";
            }

            const handleRowClick = () => {
                if (!requireLogin()) return;

                // 1) 어떤 댓글에 다는지 저장
                setReplyTargets((prev) => ({
                    ...prev,
                    [debateId]: { id: c.id, author },  // 클릭한 댓글 id + 작성자 닉
                }));

                // 2) 입력창 맨 앞에 @닉네임 고정으로 세팅
                setCommentInputs((prev) => {
                    // 혹시 기존에 쓰던 본문이 있다면, 맨 앞 단어(@닉 등)만 제거하고 뒤는 살려서 이어붙임
                    const prevBody = (prev[debateId] || "").replace(/^@?\S+\s*/, "");
                    return {
                        ...prev,
                        [debateId]: `@${author} ${prevBody}`,
                    };
                });
            };



            return (
                <React.Fragment key={c.id}>
                    <div
                        className={`${styles.commentRow} ${
                            isReply ? styles.childRow : ""
                        }`}
                        onClick={handleRowClick}
                    >
                        {/* 왼쪽: 작성자 */}
                        <div className={styles.leftCell}>
                        <span
                            className={styles.commentAuthor}
                            style={{
                                cursor: "pointer",
                                color: stringToColor(author),
                                fontWeight: 600,
                            }}
                        >
                            {author}
                        </span>
                            <span className={styles.commentIp}>
                            ({c.ipAddress || "IP 정보 없음"})
                        </span>
                        </div>

                        {/* 가운데: 멘션 태그 + 본문 */}
                        <div className={styles.middleCell}>
                            {mentionNick && (
                                <span className={styles.mentionTag}>
                                @{mentionNick}
                            </span>
                            )}
                            <span className={styles.commentText}>{contentText}</span>
                        </div>

                        {/* 오른쪽: 시간 + 삭제 */}
                        <div className={styles.rightCell}>
                            {c.createdAt && (
                                <span className={styles.commentDate}>
                                {new Date(c.createdAt).toLocaleString()}
                            </span>
                            )}

                            {currentUser?.username === author && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCommentDelete(debateId, c);
                                    }}
                                    className={styles.commentDeleteButton}
                                >
                                    X
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 자식 댓글 재귀 */}
                    {Array.isArray(c.replies) && c.replies.length > 0 &&
                        renderComments(debateId, c.replies, depth + 1)}
                </React.Fragment>
            );
        });
    };


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
                        <button onClick={() => navigate("/login")} className={styles.loginBtn}>
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
                            {["게임", "사회", "연애", "스포츠", "기타"].map((cat, index) => (
                                <button
                                    key={`unrebutted-${cat}-${index}`} // ✅ key 고유값 추가

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
                            {["게임", "사회", "연애", "스포츠", "기타"].map((cat,index) => (
                                <button
                                    key={`rebutted-${cat}-${index}`} // ✅ key 고유값 추가
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
                            {["게임", "사회", "연애", "스포츠", "기타"].map((cat,index) => (
                                <button
                                    key={`closed-${cat}-${index}`} // ✅ key 고유값 추가
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

            {/* 💬 실시간 토론장 버튼 */}
            <button
                className={styles.chatroomButton}
                onClick={() => navigate("/chatroom")}
            >
                💬 실시간 토론장 입장하기
            </button>

            {/* 카테고리 필터 */}
            <div className={styles.categoryFilter}>
                {categories.map((cat) => {
                        const icons = {
                            전체: "🌏",
                            게임: "🎮",
                            사회: "🏙️",
                            연애: "❤️",
                            스포츠: "⚽",
                            기타: "💡",
                        };
                        return (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`${styles.categoryBtn} ${
                                    selectedCategory === cat ? styles.activeCategory : ""
                                }`}
                            >
                                {icons[cat]} {cat}
                            </button>
                        );
                    })}
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
                    {currentDebates.map((debate) => (
                        <div
                            key={debate.id}
                            className={`${styles.card} ${expandedDebateId === debate.id ? styles.cardExpanded : ""}`}
                        >
                            <div className={styles.cardHeader}>
                                <h2
                                    className={styles.cardTitle}
                                    onClick={() => {
                                        const newId = expandedDebateId === debate.id ? null : debate.id;
                                        setExpandedDebateId(newId);
                                        if (newId) fetchComments(debate.id); // ✅ 댓글 트리 불러오기
                                    }}
                                    style={{ cursor: "pointer" }}
                                >
                                    {debate.title}
                                </h2>
                                {currentUser?.username === debate.author && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(debate.id);
                                        }}
                                        className={styles.deleteButton}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            {/* ⬇️ 제목 클릭 시에만 펼침 (본문/반박/댓글 전부) */}
                            {expandedDebateId === debate.id && (
                                <>
                                    <p className={styles.cardContent}>{debate.content}</p>

                                    {/* ✅ 반박하기 */}
                                    {activeTab === "unrebutted" && (
                                        <div className={styles.rebuttalArea}>
                                            {debate.author !== currentUser?.username &&
                                                (!showRebuttalInput[debate.id] ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowRebuttalInput({
                                                                ...showRebuttalInput,
                                                                [debate.id]: true,
                                                            });
                                                        }}
                                                        className={styles.rebuttalButton}
                                                    >
                                                        🗣️ 토론 반박하기
                                                    </button>
                                                ) : (
                                                    <div className={styles.rebuttalForm}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowRebuttalInput({
                                                                    ...showRebuttalInput,
                                                                    [debate.id]: false,
                                                                });
                                                            }}
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
                                                            onClick={(e) => e.stopPropagation()}
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
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRebuttalSubmit(debate.id);
                                                            }}
                                                            className={styles.rebuttalSubmit}
                                                        >
                                                            등록
                                                        </button>
                                                    </div>
                                                ))}
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
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleVote(debate.id, "author");
                                                    }}
                                                    className={`${styles.voteButton} ${styles.voteLeft}`}
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
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleVote(debate.id, "rebuttal");
                                                    }}
                                                    className={`${styles.voteButton} ${styles.voteRight}`}
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
                                            {comments[debate.id]?.length || 0})
                                        </h3>
                                        <div className={styles.commentList}>
                                            {renderComments(debate.id, comments[debate.id] || [])}


                                        </div>

                                        {currentUser && (
                                            <div
                                                className={styles.commentInputGroup}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {/* 🔔 멘션 모드 안내 바 (디시 느낌) */}
                                                {replyTargets[debate.id]?.author && (
                                                    <div className={styles.mentionBar}>
                <span className={styles.mentionLabel}>
                    ↪ @{replyTargets[debate.id].author} 님에게 답글 작성 중
                </span>
                                                        <button
                                                            type="button"
                                                            className={styles.mentionClear}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // 멘션 모드 해제 + 입력값에서 맨 앞 단어 제거
                                                                setReplyTargets((prev) => ({
                                                                    ...prev,
                                                                    [debate.id]: undefined,
                                                                }));
                                                                setCommentInputs((prev) => ({
                                                                    ...prev,
                                                                    [debate.id]: (prev[debate.id] || "").replace(
                                                                        /^@?\S+\s*/,
                                                                        ""
                                                                    ),
                                                                }));
                                                            }}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                )}

                                                <input
                                                    value={commentInputs[debate.id] || ""}
                                                    onChange={(e) =>
                                                        handleCommentChange(debate.id, e.target.value)
                                                    }
                                                    placeholder={
                                                        replyTargets[debate.id]?.author
                                                            ? "답글 내용을 입력하세요..."
                                                            : "댓글을 입력하세요..."
                                                    }
                                                    className={`${styles.commentInput} ${
                                                        replyTargets[debate.id]?.author
                                                            ? styles.commentInputMention
                                                            : ""
                                                    }`}
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
                                </>
                            )}
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
