import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./MyPage.module.css";
import CommentSection from "../components/CommentSection";
import axios from "axios";
import { API_BASE_URL } from "../api/baseURL";   // パスはファイル位置によって ../ または ../../

axios.defaults.baseURL = API_BASE_URL;

// ✅ ネットワーク固定
axios.defaults.headers.post["Content-Type"] = "application/json";

// ✅ 日付フォーマット（日本時間）
const formatKST = (iso) => {
    if (!iso) return "-";
    try {
        return new Date(iso).toLocaleString("ja-JP", { hour12: false });
    } catch {
        return iso;
    }
};

// ✅ ディベート状態テキスト/色
const getDebateStatusText = (d) =>
    d.isClosed ? "終了した討論" : d.rebuttalTitle ? "反論中" : "反論してみよう";
const getDebateStatusColor = (d) =>
    d.isClosed ? "#888" : d.rebuttalTitle ? "#e67e22" : "#27ae60";

// ✅ 状態の優先度（ソート用）: 反論してみよう(0) → 反論中(1) → 終了(2)
const statusRank = (d) => (d.isClosed ? 2 : d.rebuttalTitle ? 1 : 0);

const MyPage = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState("info");

    // プロフィール編集フォーム
    const [editForm, setEditForm] = useState({
        nickname: "",
        email: "",
        password: "",
    });
    const [confirmPassword, setConfirmPassword] = useState("");

    // 認証関連
    const [verified, setVerified] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [emailSent, setEmailSent] = useState(false);

    // 自分の投稿/UI
    const [myDebates, setMyDebates] = useState([]);
    const [expandedId, setExpandedId] = useState(null);

    // ✨ ディベート編集用状態
    const [editDebateId, setEditDebateId] = useState(null);
    const [editDebateForm, setEditDebateForm] = useState({
        title: "",
        content: "",
    });

    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const [deleting, setDeleting] = useState(false); // 🔥 退会処理ローディング
    const navigate = useNavigate();

    const [isDeleteMode, setIsDeleteMode] = useState(false); // 🔥 退会進行モード
    const [deleteReason, setDeleteReason] = useState(""); // 🔥 選択した退会理由
    const [deleteReasonDetail, setDeleteReasonDetail] = useState(""); // 🔥 その他詳細

    const [showReasonBox, setShowReasonBox] = useState(false); // 🔥 理由リストの開閉

    const DELETE_REASONS = [
        "サービスの利用頻度が低いため",
        "これ以上サービスを利用する必要がないため",
        "アカウントが多すぎて整理したいため",
        "サービスに満足していないため",
        "改善が必要な点が多いため",
        "他の競合サービスへ移行するため",
        "個人情報の流出が心配なため",
        "個人情報の収集・利用に同意できないため",
        "不要な個人情報を残したくないため",
        "その他",
    ];

    // ✅ パスワード正規表現
    // 英字 + 数字 を最低1つずつ含み、8文字以上（記号なども許可）
    const pwRegex = useMemo(
        () => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
        []
    );

    // ✅ 会員退会
    // - メール認証完了 (verified === true)
    // - パスワード 1つ入力（確認は不要）
    // - 退会理由選択
    // - 確認ダイアログで OK を押したら実際に削除 + delete_account テーブルにログ保存
    const handleDeleteAccount = async () => {
        if (!currentUser) {
            alert("ログインが必要です。");
            return;
        }

        // 退会モードでなければ無視
        if (!isDeleteMode) return;

        if (!verified) {
            alert("先にメール認証を完了してください。");
            return;
        }

        if (!editForm.password) {
            alert("パスワードを入力してください。");
            return;
        }

        if (!pwRegex.test(editForm.password)) {
            alert("パスワードは英字と数字を含む8文字以上で設定してください。");
            return;
        }

        if (!deleteReason) {
            alert("退会理由を選択してください。");
            return;
        }

        // 🔥「その他」選択時は詳細必須
        let finalReason = deleteReason;
        if (deleteReason === "その他") {
            if (!deleteReasonDetail.trim()) {
                alert("その他の退会理由を入力してください。");
                return;
            }
            finalReason = `その他: ${deleteReasonDetail.trim()}`;
        }

        const ok = window.confirm(
            "本当に退会しますか？\n退会後はすべての情報が削除され、復元はできません。"
        );
        if (!ok) return;

        try {
            setDeleting(true);

            // 1) 退会理由ログ保存
            await axios.post("/api/delete-account", {
                userId: currentUser.id,
                email: editForm.email || currentUser.email,
                reason: finalReason,
            });

            // 2) 実際のユーザー削除
            await axios.delete(`/api/users/delete/${currentUser.id}`, {
                data: { password: editForm.password },
            });

            alert("退会が完了しました。ご利用ありがとうございました。");
            localStorage.removeItem("user");
            navigate("/");
        } catch (err) {
            console.error("❌ 会員退会に失敗しました:", err);
            alert(err.response?.data || "退会処理中にエラーが発生しました。");
        } finally {
            setDeleting(false);
        }
    };

    // ✅ ログインユーザー読み込み
    useEffect(() => {
        const raw = localStorage.getItem("user");
        if (!raw) return;
        const user = JSON.parse(raw);
        setCurrentUser(user);
        setEditForm({
            nickname: user.username,
            email: user.email || "",
            password: "",
        });
        fetchMyDebates(user.username);
    }, []);

    // ✅ 自分が投稿した討論取得（状態優先 + 新しい順）
    const fetchMyDebates = async (username) => {
        if (!username) return;
        try {
            const res = await axios.get("/api/debates");
            const mine = (Array.isArray(res.data) ? res.data : []).filter(
                (d) => d.author === username
            );

            mine.sort((a, b) => {
                const s = statusRank(a) - statusRank(b);
                if (s !== 0) return s;
                // createdAt がない場合は id をフォールバックに使用
                const ad = a.createdAt
                    ? new Date(a.createdAt).getTime()
                    : a.id ?? 0;
                const bd = b.createdAt
                    ? new Date(b.createdAt).getTime()
                    : b.id ?? 0;
                return bd - ad;
            });

            setMyDebates(mine);
        } catch (err) {
            console.error("❌ 自分の討論取得に失敗しました:", err);
        }
    };

    // ✨ 自分の討論統計（件数表示用）
    const debateStats = useMemo(() => {
        const total = myDebates.length;
        const open = myDebates.filter(
            (d) => !d.isClosed && !d.rebuttalTitle
        ).length; // 反論してみよう
        const rebut = myDebates.filter(
            (d) => !d.isClosed && d.rebuttalTitle
        ).length; // 反論中
        const closed = myDebates.filter((d) => d.isClosed).length; // 終了
        return { total, open, rebut, closed };
    }, [myDebates]);

    // ✨ 編集/削除可否（「反論してみよう」のみ true）
    const canEditDebate = (debate) => !debate.isClosed && !debate.rebuttalTitle;
    const canDeleteDebate = (debate) => !debate.isClosed && !debate.rebuttalTitle;

    // ✨ 編集ボタン
    const handleDebateEditClick = (debate) => {
        if (!canEditDebate(debate)) {
            alert("反論中または終了した討論は編集できません。");
            return;
        }
        setEditDebateId(debate.id);
        setEditDebateForm({
            title: debate.title || "",
            content: debate.content || "",
        });
    };

    // ✨ 討論編集保存
    const handleDebateUpdate = async (debateId) => {
        if (
            !editDebateForm.title.trim() ||
            !editDebateForm.content.trim()
        ) {
            return alert("タイトルと内容をすべて入力してください。");
        }
        setLoading(true);
        try {
            // ⚠️ バックエンドに PUT /api/debates/{id} 実装が必要
            await axios.put(`/api/debates/${debateId}`, {
                title: editDebateForm.title,
                content: editDebateForm.content,
            });

            alert("討論が更新されました。");
            setEditDebateId(null);
            await fetchMyDebates(currentUser?.username);
        } catch (err) {
            console.error("❌ 討論編集に失敗しました:", err);
            alert(err.response?.data || "討論編集中にエラーが発生しました。");
        } finally {
            setLoading(false);
        }
    };

    // ✨ 討論削除（反論中/終了は削除不可）
    const handleMyDebateDelete = async (debate) => {
        if (!canDeleteDebate(debate)) {
            alert("反論中または終了した討論は削除できません。");
            return;
        }
        if (!window.confirm("この討論を削除しますか？")) return;

        try {
            await axios.delete(`/api/debates/${debate.id}`);
            alert("討論を削除しました。");
            if (editDebateId === debate.id) setEditDebateId(null);
            await fetchMyDebates(currentUser?.username);
        } catch (err) {
            console.error("❌ 討論削除に失敗しました:", err);
            alert(err.response?.data || "討論削除中にエラーが発生しました.");
        }
    };

    // ✅ メール認証コード送信（情報修正用：既存登録かどうかは問わない）
    const handleSendCode = async () => {
        if (!editForm.email) return alert("メールアドレスを入力してください。");
        setSending(true);
        try {
            const res = await axios.post("/api/auth/send-code-edit", null, {
                params: { email: editForm.email },
            });
            if (res.status === 200) {
                setEmailSent(true);
                alert("認証コードを送信しました。");
            }
        } catch (err) {
            console.error("❌ 認証コード送信に失敗しました:", err);
            alert(
                err.response?.data ||
                "メール送信中にエラーが発生しました。"
            );
        } finally {
            setSending(false);
        }
    };

    // ✅ 認証コード確認（情報修正用エンドポイント）
    const handleVerifyCode = async () => {
        if (!verificationCode)
            return alert("認証コードを入力してください。");
        setVerifying(true);
        try {
            const res = await axios.post("/api/auth/verify-code-edit", null, {
                params: { email: editForm.email, code: verificationCode },
            });
            const ok =
                typeof res.data === "string"
                    ? res.data.includes("성공")
                    : !!res.data;
            if (ok) {
                setVerified(true);
                alert("✅ メール認証が完了しました！");
            } else {
                alert("❌ 認証コードが正しくありません。");
            }
        } catch (err) {
            console.error("認証失敗:", err);
            alert(err.response?.data || "認証中にエラーが発生しました。");
        } finally {
            setVerifying(false);
        }
    };

    // ✅ 会員情報修正
    // バックエンド: UserController
    //   - (A) /api/users/update/{id} ← id PathVariable 版
    //   - (B) /api/users/update     ← body に id/currentEmail/newEmail 等
    // 下は (A) を前提に実装
    const handleUpdate = async () => {
        if (!editForm.nickname.trim())
            return alert("ニックネームを入力してください。");
        if (!verified) return alert("メール認証を完了してください。");

        // パスワード入力時は確認 + ルールチェック
        if (editForm.password || confirmPassword) {
            if (editForm.password !== confirmPassword) {
                return alert("パスワードが一致していません。");
            }
            if (!pwRegex.test(editForm.password)) {
                return alert(
                    "パスワードは英字と数字を含む8文字以上で設定してください。"
                );
            }
        }

        if (!currentUser) return alert("ログインが必要です。");

        setLoading(true);
        try {
            const res = await axios.put(
                `/api/users/update/${currentUser.id}`,
                {
                    username: editForm.nickname,
                    email: editForm.email, // 新メール
                    password: editForm.password || null,
                }
            );

            alert("✅ 会員情報を更新しました。");
            localStorage.setItem("user", JSON.stringify(res.data));
            setCurrentUser(res.data);
            setVerified(false);
            setEmailSent(false);
            setVerificationCode("");
            setConfirmPassword("");
        } catch (err) {
            console.error("❌ 会員情報の更新に失敗しました:", err);
            alert(
                err.response?.data ||
                "会員情報の更新中にエラーが発生しました。"
            );
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) =>
        setExpandedId(expandedId === id ? null : id);

    return (
        <div className={styles.container}>
            {/* ✅ 左側タブ（サイドバー） */}
            <aside className={styles.sidebar}>
                <h2 className={styles.sidebarTitle}>マイページ</h2>

                <button
                    className={`${styles.tabButton} ${
                        activeTab === "info" ? styles.active : ""
                    }`}
                    onClick={() => setActiveTab("info")}
                >
                    プロフィール
                </button>
                <button
                    className={`${styles.tabButton} ${
                        activeTab === "edit" ? styles.active : ""
                    }`}
                    onClick={() => setActiveTab("edit")}
                >
                    情報編集
                </button>
                <button
                    className={`${styles.tabButton} ${
                        activeTab === "posts" ? styles.active : ""
                    }`}
                    onClick={() => setActiveTab("posts")}
                >
                    自分の討論
                </button>
            </aside>

            {/* ✅ 右側メインコンテンツ */}
            <main className={styles.content}>
                {/* プロフィール情報 */}
                {activeTab === "info" && currentUser && (
                    <section className={styles.infoSection}>
                        <h3>👤 プロフィール</h3>
                        <p>
                            <b>ニックネーム:</b> {currentUser.username}
                        </p>
                        <p>
                            <b>メールアドレス:</b> {currentUser.email}
                        </p>
                        <p>
                            <b>EXP:</b> {currentUser.exp || 0}
                        </p>
                    </section>
                )}

                {/* 情報編集 */}
                {activeTab === "edit" && (
                    <section className={styles.editSection}>
                        <h3>✏️ 情報編集</h3>

                        <div className={styles.inputGroup}>
                            <label>ニックネーム</label>
                            <input
                                type="text"
                                value={editForm.nickname}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        nickname: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label>メールアドレス</label>
                            <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        email: e.target.value,
                                    })
                                }
                            />
                            {!verified && (
                                <button
                                    onClick={handleSendCode}
                                    className={styles.smallButton}
                                    disabled={sending}
                                    title="編集用の認証メールを送信します"
                                >
                                    {sending ? "送信中..." : "認証コード送信"}
                                </button>
                            )}
                        </div>

                        {emailSent && !verified && (
                            <div className={styles.inputGroup}>
                                <label>認証コード入力</label>
                                <input
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) =>
                                        setVerificationCode(e.target.value)
                                    }
                                />
                                <button
                                    onClick={handleVerifyCode}
                                    className={styles.smallButton}
                                    disabled={verifying}
                                >
                                    {verifying ? "確認中..." : "認証確認"}
                                </button>
                            </div>
                        )}

                        {/* ✅ パスワード（編集 / 退会 共用） */}
                        <div className={styles.inputGroup}>
                            <label>
                                {isDeleteMode
                                    ? "パスワード（本人確認用）"
                                    : "新しいパスワード"}
                            </label>
                            <input
                                type="password"
                                value={editForm.password}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        password: e.target.value,
                                    })
                                }
                                placeholder={
                                    isDeleteMode
                                        ? "現在のアカウントのパスワードを入力してください"
                                        : "英字+数字を含む8文字以上"
                                }
                            />
                        </div>

                        {/* ✅ 通常の情報編集時のみ パスワード確認 + 更新ボタン表示 */}
                        {!isDeleteMode && (
                            <>
                                <div className={styles.inputGroup}>
                                    <label>パスワード確認</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) =>
                                            setConfirmPassword(
                                                e.target.value
                                            )
                                        }
                                        placeholder="パスワードをもう一度入力してください"
                                    />
                                </div>

                                <button
                                    onClick={handleUpdate}
                                    disabled={loading}
                                    className={styles.updateButton}
                                >
                                    {loading ? "更新中..." : "更新する"}
                                </button>
                            </>
                        )}

                        {/* 🔥 退会モード時のみ「退会理由」ボックスを表示 */}
                        {isDeleteMode && (
                            <div className={styles.deleteReasonSection}>
                                <button
                                    type="button"
                                    className={styles.deleteReasonToggle}
                                    onClick={() =>
                                        setShowReasonBox((prev) => !prev)
                                    }
                                >
                                    <span>退会理由を選択</span>
                                    <span className={styles.chevron}>
                                        {showReasonBox ? "▲" : "▼"}
                                    </span>
                                </button>

                                {showReasonBox && (
                                    <div
                                        className={styles.deleteReasonList}
                                    >
                                        {DELETE_REASONS.map((reason) => (
                                            <label
                                                key={reason}
                                                className={
                                                    styles.deleteReasonItem
                                                }
                                            >
                                                <input
                                                    type="radio"
                                                    name="deleteReason"
                                                    value={reason}
                                                    checked={
                                                        deleteReason ===
                                                        reason
                                                    }
                                                    onChange={(e) =>
                                                        setDeleteReason(
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                                <span>{reason}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* 🔥「その他」選択時は入力欄表示 */}
                                {deleteReason === "その他" && (
                                    <textarea
                                        className={
                                            styles.deleteReasonEtcInput
                                        }
                                        placeholder="具体的な退会理由を入力してください。"
                                        value={deleteReasonDetail}
                                        onChange={(e) =>
                                            setDeleteReasonDetail(
                                                e.target.value
                                            )
                                        }
                                    />
                                )}

                                {deleteReason && !showReasonBox && (
                                    <p
                                        className={
                                            styles.deleteReasonSelected
                                        }
                                    >
                                        選択中の理由:{" "}
                                        <b>{deleteReason}</b>
                                    </p>
                                )}
                            </div>
                        )}

                        {/* 🔥 会員退会エリア */}
                        {!isDeleteMode ? (
                            // ステップ1: 退会モードに入るボタン
                            <div className={styles.deleteSection}>
                                <p className={styles.deleteNotice}>
                                    ⚠️ 退会するとすべてのデータが完全に削除され、復元はできません。
                                </p>
                                <button
                                    type="button"
                                    className={styles.deleteButton}
                                    onClick={() => {
                                        setIsDeleteMode(true);
                                        setDeleteReason("");
                                        setShowReasonBox(true);
                                        setDeleteReasonDetail("");
                                        setEditForm((prev) => ({
                                            ...prev,
                                            password: "",
                                        }));
                                        setConfirmPassword("");
                                    }}
                                    disabled={deleting}
                                >
                                    退会手続きを進める
                                </button>
                            </div>
                        ) : (
                            // ステップ2: 理由選択後、実際の退会ボタン + キャンセル
                            <div className={styles.deleteSection}>
                                <p className={styles.deleteNotice}>
                                    ⚠️ 退会後はすべての情報が削除され、復元はできません。
                                </p>
                                <div
                                    className={styles.deleteButtonGroup}
                                >
                                    <button
                                        type="button"
                                        className={
                                            styles.deleteCancelButton
                                        }
                                        onClick={() => {
                                            setIsDeleteMode(false);
                                            setDeleteReason("");
                                            setDeleteReasonDetail("");
                                            setShowReasonBox(false);
                                            setEditForm((prev) => ({
                                                ...prev,
                                                password: "",
                                            }));
                                        }}
                                        disabled={deleting}
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.deleteButton}
                                        onClick={handleDeleteAccount}
                                        disabled={deleting}
                                    >
                                        {deleting
                                            ? "退会処理中..."
                                            : "本当に退会する"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* 自分が投稿した討論 */}
                {activeTab === "posts" && (
                    <section className={styles.postSection}>
                        <div className={styles.postHeaderRow}>
                            <h3>🧾 自分が投稿した討論</h3>
                            <div className={styles.postStats}>
                                <span>合計 {debateStats.total}件</span>
                                <span>
                                    🗣 反論してみよう {debateStats.open}件
                                </span>
                                <span>
                                    ⚔ 反論中 {debateStats.rebut}件
                                </span>
                                <span>
                                    🕛 終了 {debateStats.closed}件
                                </span>
                            </div>
                        </div>

                        {myDebates.length === 0 ? (
                            <p>投稿した討論はありません。</p>
                        ) : (
                            myDebates.map((debate) => {
                                const statusText =
                                    getDebateStatusText(debate);
                                const canEdit = canEditDebate(debate);
                                const canDelete = canDeleteDebate(debate);

                                return (
                                    <div
                                        key={debate.id}
                                        className={styles.debateCard}
                                    >
                                        {/* カードヘッダー */}
                                        <div
                                            className={styles.debateHeader}
                                            onClick={() =>
                                                toggleExpand(debate.id)
                                            }
                                        >
                                            <div
                                                className={
                                                    styles.debateHeaderLeft
                                                }
                                            >
                                                <h4
                                                    className={
                                                        styles.debateTitle
                                                    }
                                                >
                                                    {debate.title}
                                                </h4>
                                                <span
                                                    className={`${styles.statusBadge} ${
                                                        debate.isClosed
                                                            ? styles.statusClosed
                                                            : debate.rebuttalTitle
                                                                ? styles.statusRebutted
                                                                : styles.statusOpen
                                                    }`}
                                                >
                                                    {statusText}
                                                </span>
                                            </div>

                                            <div
                                                className={
                                                    styles.debateHeaderRight
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles.debateDate
                                                    }
                                                >
                                                    🕓{" "}
                                                    {formatKST(
                                                        debate.createdAt
                                                    )}
                                                </span>
                                                <span
                                                    className={
                                                        styles.chevron
                                                    }
                                                >
                                                    {expandedId ===
                                                    debate.id
                                                        ? "▲"
                                                        : "▼"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 展開された内容 */}
                                        {expandedId === debate.id && (
                                            <div
                                                className={
                                                    styles.debateContent
                                                }
                                            >
                                                <p
                                                    className={
                                                        styles.debateText
                                                    }
                                                >
                                                    {debate.content}
                                                </p>

                                                {debate.rebuttalTitle && (
                                                    <div
                                                        className={
                                                            styles.rebuttalBox
                                                        }
                                                    >
                                                        <h4>
                                                            🗣️{" "}
                                                            {
                                                                debate.rebuttalTitle
                                                            }
                                                        </h4>
                                                        <p>
                                                            {
                                                                debate.rebuttalContent
                                                            }
                                                        </p>
                                                        <p
                                                            className={
                                                                styles.rebuttalMeta
                                                            }
                                                        >
                                                            -{" "}
                                                            {
                                                                debate.rebuttalAuthor
                                                            }
                                                        </p>
                                                    </div>
                                                )}

                                                {debate.isClosed && (
                                                    <div
                                                        className={
                                                            styles.resultBox
                                                        }
                                                    >
                                                        {debate.winner ===
                                                        "draw" ? (
                                                            <p>🤝 引き分け</p>
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
                                                )}

                                                {/* ✨ 編集/削除ボタン領域 */}
                                                <div
                                                    className={
                                                        styles.postActions
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.postMeta
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                styles.postCategory
                                                            }
                                                        >
                                                            📂{" "}
                                                            {debate.category ||
                                                                "その他"}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={
                                                            styles.postButtonGroup
                                                        }
                                                    >
                                                        {/* 編集ボタン */}
                                                        {canEdit ? (
                                                            <button
                                                                className={
                                                                    styles.postActionButton
                                                                }
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    handleDebateEditClick(
                                                                        debate
                                                                    );
                                                                }}
                                                            >
                                                                ✏️ 編集
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className={`${styles.postActionButton} ${styles.postActionButtonDisabled}`}
                                                                onClick={(
                                                                    e
                                                                ) =>
                                                                    e.stopPropagation()
                                                                }
                                                                title="反論中・終了した討論は編集できません。"
                                                            >
                                                                ✏️ 編集不可
                                                            </button>
                                                        )}

                                                        {/* 削除ボタン */}
                                                        {canDelete ? (
                                                            <button
                                                                className={`${styles.postActionButton} ${styles.postDeleteButton}`}
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    handleMyDebateDelete(
                                                                        debate
                                                                    );
                                                                }}
                                                            >
                                                                🗑 削除
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className={`${styles.postActionButton} ${styles.postActionButtonDisabled}`}
                                                                onClick={(
                                                                    e
                                                                ) =>
                                                                    e.stopPropagation()
                                                                }
                                                                title="反論中・終了した討論は削除できません。"
                                                            >
                                                                🗑 削除不可
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* ✨ 編集フォーム（「反論してみよう」の投稿のみ） */}
                                                {editDebateId ===
                                                    debate.id && (
                                                        <div
                                                            className={
                                                                styles.debateEditArea
                                                            }
                                                        >
                                                            <input
                                                                type="text"
                                                                className={
                                                                    styles.debateEditInput
                                                                }
                                                                placeholder="タイトルを入力してください"
                                                                value={
                                                                    editDebateForm.title
                                                                }
                                                                onChange={(e) =>
                                                                    setEditDebateForm(
                                                                        (prev) => ({
                                                                            ...prev,
                                                                            title: e
                                                                                .target
                                                                                .value,
                                                                        })
                                                                    )
                                                                }
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            />
                                                            <textarea
                                                                className={
                                                                    styles.debateEditTextarea
                                                                }
                                                                placeholder="内容を入力してください"
                                                                value={
                                                                    editDebateForm.content
                                                                }
                                                                onChange={(e) =>
                                                                    setEditDebateForm(
                                                                        (prev) => ({
                                                                            ...prev,
                                                                            content:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        })
                                                                    )
                                                                }
                                                                onClick={(e) =>
                                                                    e.stopPropagation()
                                                                }
                                                            />
                                                            <div
                                                                className={
                                                                    styles.editButtonsRow
                                                                }
                                                            >
                                                                <button
                                                                    className={
                                                                        styles.cancelEditButton
                                                                    }
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditDebateId(
                                                                            null
                                                                        );
                                                                    }}
                                                                >
                                                                    キャンセル
                                                                </button>
                                                                <button
                                                                    className={
                                                                        styles.saveEditButton
                                                                    }
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDebateUpdate(
                                                                            debate.id
                                                                        );
                                                                    }}
                                                                    disabled={
                                                                        loading
                                                                    }
                                                                >
                                                                    {loading
                                                                        ? "保存中..."
                                                                        : "保存"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                {/* ✅ コメントセクション（元のまま） */}
                                                <CommentSection
                                                    debateId={debate.id}
                                                    currentUser={currentUser}
                                                    refresh={() =>
                                                        fetchMyDebates(
                                                            currentUser?.username
                                                        )
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </section>
                )}
            </main>
        </div>
    );
};

export default MyPage;
