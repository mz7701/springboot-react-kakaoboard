import React, { useEffect, useState } from "react";
import axios from "axios";
import { Trash2, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./DebateBoard.module.css";
import { API_BASE_URL } from "../api/baseURL";   // パスはファイル位置によって ../ または ../../

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
    // ✅ どのコメントに返信するか（ディシ風メンション）
    const [replyTargets, setReplyTargets] = useState({});

    const [activeTab, setActiveTab] = useState("unrebutted");
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState("すべて");
    const categories = ["すべて", "ゲーム", "社会", "恋愛", "スポーツ", "その他"];
    const [hoveredTab, setHoveredTab] = useState(null);
    // 一覧 / 詳細表示モード & ページネーション
    const [viewMode, setViewMode] = useState("list"); // 'list' | 'detail'
    const [selectedDebate, setSelectedDebate] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // 1ページあたり 10件
    const [searchTerm, setSearchTerm] = useState("");
    const [currentTab, setCurrentTab] = useState("all");
    const [comments, setComments] = useState({});

    const fetchComments = async (debateId) => {
        if (!debateId) return;

        try {
            // ✅ ツリー形式コメント取得エンドポイント
            const res = await axios.get(`/api/debates/${debateId}/comments/tree`);

            setComments((prev) => ({
                ...prev,
                [debateId]: Array.isArray(res.data) ? res.data : [],
            }));
        } catch (err) {
            console.error("❌ コメント取得に失敗しました:", err);
        }
    };

    // ✅ タイトルクリック時の展開/折りたたみ用
    const [expandedDebateId, setExpandedDebateId] = useState(null);

    const MAX_COMMENT_INDENT = 4;

    const DEADLINE_HOURS = 12;
    const KOREA_OFFSET_HOURS = 9; // サーバー(UTC)と韓国時間の差

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

        if (diffMs <= 0) return "⏰ 締め切られた討論";

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}時間 ${minutes}分 残り`;
    };

    // ✅ ログイン必須機能の共通ガード
    const requireLogin = () => {
        if (!currentUser) {
            alert("⚠️ ログイン後にご利用ください。");
            return false;
        }
        return true;
    };

    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        if (savedUser) setCurrentUser(JSON.parse(savedUser));

        // 初回ロード時にデータ取得
        fetchDebates();

        // 3秒ごとに定期更新
        const interval = setInterval(() => {
            fetchDebates(false);
            if (expandedDebateId) {
                fetchComments(expandedDebateId); // ✅ 展開中カードのコメントも更新
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const fetchDebates = async (shouldAutoSwitch = true) => {
        try {
            const res = await axios.get("/api/debates");
            const data = Array.isArray(res.data) ? res.data.reverse() : [];
            setDebates(data);

            if (shouldAutoSwitch) {
                // 自動タブ切り替えロジックを入れる場合はここに
            }
        } catch (err) {
            console.error("❌ 討論データ取得に失敗しました:", err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("本当に削除しますか？")) return;
        try {
            await axios.delete(`/api/debates/${id}`);
            alert("🗑️ 削除しました。");
            fetchDebates();
        } catch (err) {
            console.error("削除に失敗しました:", err);
            alert("削除中にエラーが発生しました。");
        }
    };

    const handleRebuttalSubmit = async (debateId) => {
        if (!requireLogin()) return;
        const input = rebuttalInputs[debateId];
        if (!input?.title || !input?.content)
            return alert("タイトルと内容を入力してください！");

        try {
            await axios.post(`/api/debates/${debateId}/rebuttal`, {
                title: input.title,
                content: input.content,
                author: currentUser?.username || "匿名",
            });
            alert("反論が登録されました！");
            setShowRebuttalInput({ ...showRebuttalInput, [debateId]: false });
            fetchDebates();
        } catch (err) {
            console.error("反論登録に失敗しました:", err);
        }
    };

    const handleVote = async (debateId, type) => {
        if (!requireLogin()) return;
        try {
            await axios.post(`/api/debates/${debateId}/vote`, {
                type,
                voter: currentUser?.username,
            });
            alert("✅ 投票が完了しました！");
            fetchDebates();
        } catch (err) {
            console.error("投票に失敗しました:", err);
            const msg =
                err.response?.data?.message ||
                err.response?.data ||
                "サーバーエラーにより投票に失敗しました。";
            alert(typeof msg === "string" ? msg : JSON.stringify(msg));
        }
    };

    // ✅ コメント入力内容変更（メンション保護）
    const handleCommentChange = (debateId, value) => {
        const target = replyTargets[debateId]; // { id, author } | undefined

        if (target) {
            const prefix = `@${target.author} `;

            // メンションモード中なのに、先頭が prefix でない → メンション部分が触られた
            if (!value.startsWith(prefix)) {
                // 先頭の単語(@ニック or ニックネーム)を削除して通常コメントに戻す
                const bodyOnly = value.replace(/^@?\S+\s*/, "");
                setReplyTargets((prev) => ({
                    ...prev,
                    [debateId]: undefined, // メンションモード解除
                }));
                setCommentInputs((prev) => ({
                    ...prev,
                    [debateId]: bodyOnly, // メンションを消して本文だけ残す
                }));
                return;
            }
        }

        // メンションはそのまま、後ろの内容だけ変更
        setCommentInputs((prev) => ({
            ...prev,
            [debateId]: value,
        }));
    };

    // ✅ コメント / 返信登録
    const handleCommentSubmit = async (debateId) => {
        if (!requireLogin()) return;

        const raw = (commentInputs[debateId] || "").trim();
        if (!raw) {
            alert("コメントを入力してください！");
            return;
        }

        const target = replyTargets[debateId]; // { id, author } | undefined
        const isReply = !!target;
        let finalText = raw;

        if (isReply) {
            const prefix = `@${target.author} `;
            if (!raw.startsWith(prefix)) {
                // 万一先頭がおかしくなっていたら通常コメントとして扱う
                finalText = raw;
            }
        }

        try {
            // ✅ コントローラ仕様に合わせて body を構成
            const body = {
                author: currentUser?.username || "匿名",
                text: finalText,
            };

            // ✅ 返信の場合のみ parentId を付与
            if (isReply) {
                body.parentId = target.id;
            }

            // ✅ エンドポイントは常にここ
            await axios.post(`/api/debates/${debateId}/comments`, body);

            // 入力値 + ターゲット初期化
            setCommentInputs((prev) => ({ ...prev, [debateId]: "" }));
            setReplyTargets((prev) => ({ ...prev, [debateId]: undefined }));

            await fetchComments(debateId);
            fetchDebates();
        } catch (err) {
            console.error("コメント登録に失敗しました:", err);
            alert("コメント登録中にエラーが発生しました。");
        }
    };

    // ✨ コメント削除（自分のものだけ）
    const handleCommentDelete = async (debateId, comment) => {
        if (!requireLogin()) return;

        if (currentUser?.username !== comment.author) {
            alert("自分が書いたコメントのみ削除できます。");
            return;
        }

        if (!window.confirm("コメントを削除しますか？")) return;

        try {
            // ⚠️ バックエンドに DELETE /api/debates/{debateId}/comments/{commentId} 実装が必要
            await axios.delete(`/api/debates/${debateId}/comments/${comment.id}`);
            await fetchComments(debateId);
            await fetchDebates();
        } catch (err) {
            console.error("コメント削除に失敗しました:", err);
            alert(err.response?.data || "コメント削除中にエラーが発生しました。");
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
            selectedCategory === "すべて" || d.category === selectedCategory;
        const searchMatch = d.title
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase());

        return tabMatch && categoryMatch && searchMatch;
    });

    // ✅ ページ分割（スライス）
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentDebates = filteredDebates.slice(indexOfFirst, indexOfLast);

    const renderComments = (debateId, comments, depth = 0) => {
        if (!Array.isArray(comments) || comments.length === 0) return null;

        const uniqueComments = Array.from(
            new Map(comments.map((c) => [c.id, c])).values()
        );

        return uniqueComments.map((c) => {
            const author = c.author || "匿名";
            const isReply = depth > 0;

            // 🔹 サーバーに保存されている元のテキスト
            const rawText = c.text || "";
            let mentionNick = null;
            let contentText = rawText;

            // "@ニックネーム 本文" 形式ならメンションと本文を分離
            const mentionMatch = rawText.match(/^@(\S+)\s+(.*)$/);
            if (mentionMatch) {
                mentionNick = mentionMatch[1];
                contentText = mentionMatch[2] || "";
            }

            const handleRowClick = () => {
                if (!requireLogin()) return;

                // 1) どのコメントに対する返信か保存
                setReplyTargets((prev) => ({
                    ...prev,
                    [debateId]: { id: c.id, author }, // クリックしたコメント id + 投稿者
                }));

                // 2) 入力欄の先頭に @ニックネーム を固定
                setCommentInputs((prev) => {
                    // すでに本文を書いていた場合は、先頭の単語(@ニック 等)を消して後ろを残す
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
                        {/* 左: 投稿者 */}
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
                                ({c.ipAddress || "IP 情報なし"})
                            </span>
                        </div>

                        {/* 中央: メンションタグ + 本文 */}
                        <div className={styles.middleCell}>
                            {mentionNick && (
                                <span className={styles.mentionTag}>
                                    @{mentionNick}
                                </span>
                            )}
                            <span className={styles.commentText}>{contentText}</span>
                        </div>

                        {/* 右: 時間 + 削除 */}
                        <div className={styles.rightCell}>
                            {c.createdAt && (
                                <span className={styles.commentDate}>
                                    {new Date(c.createdAt).toLocaleString("ja-JP", {
                                        hour12: false,
                                    })}
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

                    {/* 子コメント再帰 */}
                    {Array.isArray(c.replies) &&
                        c.replies.length > 0 &&
                        renderComments(debateId, c.replies, depth + 1)}
                </React.Fragment>
            );
        });
    };

    return (
        <div className={styles.container}>
            {/* ✅ ヘッダーエリア */}
            <div className={styles.header}>
                <h1 className={styles.title}>🔥 異議あり!!</h1>

                <input
                    type="text"
                    placeholder="タイトルで検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />

                {/* ✅ ログイン状態によってボタン表示切り替え */}
                <div className={styles.userArea}>
                    {!currentUser ? (
                        // ログインしていない場合 → ログインボタンのみ
                        <button
                            onClick={() => navigate("/login")}
                            className={styles.loginBtn}
                        >
                            ログイン
                        </button>
                    ) : (
                        // ログイン中 → ユーザー情報 + ログアウトボタン
                        <>
                            <div className={styles.userInfo}>
                                <p
                                    className={styles.username}
                                    onClick={() => navigate("/mypage")}
                                    style={{
                                        cursor: "pointer",
                                        textDecoration: "underline",
                                    }}
                                >
                                    {currentUser.username}
                                </p>
                                <p className={styles.exp}>EXP: {currentUser.exp}</p>
                            </div>
                            <button
                                onClick={() => {
                                    localStorage.removeItem("user");
                                    setCurrentUser(null);
                                    alert("ログアウトしました。");
                                }}
                                className={styles.logoutBtn}
                            >
                                ログアウト
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ✅ 新しい討論作成ボタン（ログイン必須） */}
            <button
                onClick={() => {
                    if (!requireLogin()) return;
                    navigate("/create");
                }}
                disabled={loading}
                className={styles.postButton}
            >
                ✏️ 新しい討論を作成
            </button>

            {/* ✅ タブメニュー（ホバー時カテゴリー選択） */}
            <div className={styles.tabContainer}>
                {/* 🗣️ 反論してみよう */}
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
                            setSelectedCategory("すべて");
                            setCurrentPage(1);
                        }}
                    >
                        🗣️ 反論してみよう
                    </button>

                    {hoveredTab === "unrebutted" && (
                        <div className={styles.categoryDropdown}>
                            {["ゲーム", "社会", "恋愛", "スポーツ", "その他"].map(
                                (cat, index) => (
                                    <button
                                        key={`unrebutted-${cat}-${index}`}
                                        onClick={() => {
                                            setSelectedCategory(cat);
                                            setActiveTab("unrebutted");
                                            setCurrentPage(1);
                                        }}
                                        className={`${styles.categoryItem} ${
                                            selectedCategory === cat
                                                ? styles.activeCategory
                                                : ""
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* ⚔️ 反論中 */}
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
                            setSelectedCategory("すべて");
                            setCurrentPage(1);
                        }}
                    >
                        ⚔️ 反論中
                    </button>

                    {hoveredTab === "rebutted" && (
                        <div className={styles.categoryDropdown}>
                            {["ゲーム", "社会", "恋愛", "スポーツ", "その他"].map(
                                (cat, index) => (
                                    <button
                                        key={`rebutted-${cat}-${index}`}
                                        onClick={() => {
                                            setSelectedCategory(cat);
                                            setActiveTab("rebutted");
                                            setCurrentPage(1);
                                        }}
                                        className={`${styles.categoryItem} ${
                                            selectedCategory === cat
                                                ? styles.activeCategory
                                                : ""
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* 🕛 終了した討論 */}
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
                            setSelectedCategory("すべて");
                            setCurrentPage(1);
                        }}
                    >
                        🕛 終了した討論
                    </button>

                    {hoveredTab === "closed" && (
                        <div className={styles.categoryDropdown}>
                            {["ゲーム", "社会", "恋愛", "スポーツ", "その他"].map(
                                (cat, index) => (
                                    <button
                                        key={`closed-${cat}-${index}`}
                                        onClick={() => {
                                            setSelectedCategory(cat);
                                            setActiveTab("closed");
                                            setCurrentPage(1);
                                        }}
                                        className={`${styles.categoryItem} ${
                                            selectedCategory === cat
                                                ? styles.activeCategory
                                                : ""
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 💬 リアルタイム討論室ボタン */}
            <button
                className={styles.chatroomButton}
                onClick={() => navigate("/chatroom")}
            >
                💬 リアルタイム討論室に入る
            </button>

            {/* カテゴリーフィルター */}
            <div className={styles.categoryFilter}>
                {categories.map((cat) => {
                    const icons = {
                        すべて: "🌏",
                        ゲーム: "🎮",
                        社会: "🏙️",
                        恋愛: "❤️",
                        スポーツ: "⚽",
                        その他: "💡",
                    };
                    return (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`${styles.categoryBtn} ${
                                selectedCategory === cat
                                    ? styles.activeCategory
                                    : ""
                            }`}
                        >
                            {icons[cat]} {cat}
                        </button>
                    );
                })}
            </div>

            {/* ✅ 討論一覧 */}
            {filteredDebates.length === 0 ? (
                <p
                    style={{
                        textAlign: "center",
                        color: "#888",
                        marginTop: "2rem",
                    }}
                >
                    {activeTab === "unrebutted"
                        ? "反論可能な討論はありません。"
                        : activeTab === "rebutted"
                            ? "現在、反論中の討論はありません。"
                            : "終了した討論はありません。"}
                </p>
            ) : (
                <div className={styles.debateList}>
                    {currentDebates.map((debate) => (
                        <div
                            key={debate.id}
                            className={`${styles.card} ${
                                expandedDebateId === debate.id
                                    ? styles.cardExpanded
                                    : ""
                            }`}
                        >
                            <div className={styles.cardHeader}>
                                <h2
                                    className={styles.cardTitle}
                                    onClick={() => {
                                        const newId =
                                            expandedDebateId === debate.id
                                                ? null
                                                : debate.id;
                                        setExpandedDebateId(newId);
                                        if (newId) fetchComments(debate.id); // ✅ コメントツリーを取得
                                    }}
                                    style={{ cursor: "pointer" }}
                                >
                                    {debate.title}
                                </h2>
                                {currentUser?.username === debate.author && !debate.isClosed &&(
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

                            {/* ⬇️ タイトルクリック時だけ展開（本文/反論/コメント） */}
                            {expandedDebateId === debate.id && (
                                <>
                                    <p className={styles.cardContent}>
                                        {debate.content}
                                    </p>

                                    {/* ✅ 反論投稿 */}
                                    {activeTab === "unrebutted" && (
                                        <div className={styles.rebuttalArea}>
                                            {debate.author !==
                                                currentUser?.username &&
                                                (!showRebuttalInput[
                                                    debate.id
                                                    ] ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowRebuttalInput(
                                                                {
                                                                    ...showRebuttalInput,
                                                                    [debate.id]:
                                                                        true,
                                                                }
                                                            );
                                                        }}
                                                        className={
                                                            styles.rebuttalButton
                                                        }
                                                    >
                                                        🗣️ この討論に反論する
                                                    </button>
                                                ) : (
                                                    <div
                                                        className={
                                                            styles.rebuttalForm
                                                        }
                                                    >
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowRebuttalInput(
                                                                    {
                                                                        ...showRebuttalInput,
                                                                        [debate.id]:
                                                                            false,
                                                                    }
                                                                );
                                                            }}
                                                            className={
                                                                styles.rebuttalCloseBtn
                                                            }
                                                        >
                                                            ❌
                                                        </button>

                                                        <input
                                                            type="text"
                                                            placeholder="反論のタイトル"
                                                            value={
                                                                rebuttalInputs[
                                                                    debate.id
                                                                    ]?.title || ""
                                                            }
                                                            onChange={(e) =>
                                                                setRebuttalInputs(
                                                                    {
                                                                        ...rebuttalInputs,
                                                                        [debate.id]:
                                                                            {
                                                                                ...rebuttalInputs[
                                                                                    debate.id
                                                                                    ],
                                                                                title: e
                                                                                    .target
                                                                                    .value,
                                                                            },
                                                                    }
                                                                )
                                                            }
                                                            className={
                                                                styles.rebuttalInput
                                                            }
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        />
                                                        <textarea
                                                            placeholder="反論内容を入力してください"
                                                            value={
                                                                rebuttalInputs[
                                                                    debate.id
                                                                    ]?.content ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                setRebuttalInputs(
                                                                    {
                                                                        ...rebuttalInputs,
                                                                        [debate.id]:
                                                                            {
                                                                                ...rebuttalInputs[
                                                                                    debate.id
                                                                                    ],
                                                                                content:
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            },
                                                                    }
                                                                )
                                                            }
                                                            className={
                                                                styles.rebuttalTextarea
                                                            }
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRebuttalSubmit(
                                                                    debate.id
                                                                );
                                                            }}
                                                            className={
                                                                styles.rebuttalSubmit
                                                            }
                                                        >
                                                            登録
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                    {/* ✅ 反論中（投票） */}
                                    {activeTab === "rebutted" && (
                                        <>
                                            {debate.rebuttalAt &&
                                                !debate.isClosed && (
                                                    <p
                                                        style={{
                                                            textAlign: "right",
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        🕒{" "}
                                                        {getRemainingTime(
                                                            debate
                                                        )}
                                                    </p>
                                                )}

                                            <div
                                                className={styles.rebuttalBox}
                                            >
                                                <h4>
                                                    🗣️{" "}
                                                    {
                                                        debate.rebuttalTitle
                                                    }
                                                </h4>
                                                <p>{debate.rebuttalContent}</p>
                                                <p
                                                    className={
                                                        styles.rebuttalMeta
                                                    }
                                                >
                                                    - {debate.rebuttalAuthor}
                                                </p>
                                            </div>

                                            <div
                                                className={styles.voteSection}
                                            >
                                                <button
                                                    disabled={
                                                        debate.isClosed ||
                                                        currentUser?.username ===
                                                        debate.author ||
                                                        currentUser?.username ===
                                                        debate.rebuttalAuthor
                                                    }
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleVote(
                                                            debate.id,
                                                            "author"
                                                        );
                                                    }}
                                                    className={`${styles.voteButton} ${styles.voteLeft}`}
                                                >
                                                    {debate.author} (
                                                    {debate.authorVotes})
                                                </button>

                                                <span
                                                    className={styles.vs}
                                                >
                                                    VS
                                                </span>

                                                <button
                                                    disabled={
                                                        debate.isClosed ||
                                                        currentUser?.username ===
                                                        debate.author ||
                                                        currentUser?.username ===
                                                        debate.rebuttalAuthor
                                                    }
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleVote(
                                                            debate.id,
                                                            "rebuttal"
                                                        );
                                                    }}
                                                    className={`${styles.voteButton} ${styles.voteRight}`}
                                                >
                                                    {debate.rebuttalAuthor} (
                                                    {debate.rebuttalVotes})
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {/* ✅ 終了した討論 */}
                                    {activeTab === "closed" && (
                                        <>
                                            <div
                                                className={styles.rebuttalBox}
                                            >
                                                <h4>
                                                    🗣️{" "}
                                                    {
                                                        debate.rebuttalTitle
                                                    }
                                                </h4>
                                                <p>{debate.rebuttalContent}</p>
                                                <p
                                                    className={
                                                        styles.rebuttalMeta
                                                    }
                                                >
                                                    - {debate.rebuttalAuthor}
                                                </p>
                                            </div>

                                            <div
                                                className={
                                                    styles.closedSection
                                                }
                                            >
                                                <h4>🕛 終了した討論</h4>

                                                {/* ✅ 引き分けの場合 */}
                                                {debate.winner === "draw" ? (
                                                    <p>
                                                        🤝 引き分けです！
                                                    </p>
                                                ) : (
                                                    <p>
                                                        🏆 勝者:{" "}
                                                        {debate.winner ===
                                                        "author"
                                                            ? debate.author
                                                            : debate.rebuttalAuthor}
                                                    </p>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* ✅ コメントセクション */}
                                    <div className={styles.commentSection}>
                                        <h3 className={styles.commentTitle}>
                                            <MessageSquare className="w-4 h-4" />{" "}
                                            コメント (
                                            {comments[debate.id]?.length ||
                                                0}
                                            )
                                        </h3>
                                        <div
                                            className={styles.commentList}
                                        >
                                            {renderComments(
                                                debate.id,
                                                comments[debate.id] || []
                                            )}
                                        </div>

                                        {currentUser && (
                                            <div
                                                className={
                                                    styles.commentInputGroup
                                                }
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                {/* 🔔 メンションモード案内バー */}
                                                {replyTargets[debate.id]
                                                    ?.author && (
                                                    <div
                                                        className={
                                                            styles.mentionBar
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                styles.mentionLabel
                                                            }
                                                        >
                                                            ↪ @
                                                            {
                                                                replyTargets[
                                                                    debate.id
                                                                    ].author
                                                            }{" "}
                                                            さんへの返信を作成中
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.mentionClear
                                                            }
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // メンションモード解除 + 入力値の先頭単語削除
                                                                setReplyTargets(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [debate
                                                                            .id]:
                                                                        undefined,
                                                                    })
                                                                );
                                                                setCommentInputs(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [debate
                                                                            .id]:
                                                                            (prev[
                                                                                    debate
                                                                                        .id
                                                                                    ] ||
                                                                                ""
                                                                            ).replace(
                                                                                /^@?\S+\s*/,
                                                                                ""
                                                                            ),
                                                                    })
                                                                );
                                                            }}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                )}

                                                <input
                                                    value={
                                                        commentInputs[
                                                            debate.id
                                                            ] || ""
                                                    }
                                                    onChange={(e) =>
                                                        handleCommentChange(
                                                            debate.id,
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder={
                                                        replyTargets[
                                                            debate.id
                                                            ]?.author
                                                            ? "返信内容を入力してください..."
                                                            : "コメントを入力してください..."
                                                    }
                                                    className={`${styles.commentInput} ${
                                                        replyTargets[
                                                            debate.id
                                                            ]?.author
                                                            ? styles.commentInputMention
                                                            : ""
                                                    }`}
                                                />
                                                <button
                                                    onClick={() =>
                                                        handleCommentSubmit(
                                                            debate.id
                                                        )
                                                    }
                                                    className={
                                                        styles.commentSubmit
                                                    }
                                                >
                                                    登録
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

            {/* ✅ ページネーション */}
            <div className={styles.pagination}>
                {Array.from(
                    {
                        length: Math.ceil(
                            filteredDebates.length / itemsPerPage
                        ),
                    },
                    (_, i) => i + 1
                ).map((page) => (
                    <button
                        key={page}
                        className={`${styles.pageBtn} ${
                            currentPage === page
                                ? styles.activePage
                                : ""
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
