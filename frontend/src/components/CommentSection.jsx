// 📁 src/components/CommentSection.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./CommentSection.module.css";

import { API_BASE_URL } from "../api/baseURL";   // パスはファイル位置によって ../ または ../../

axios.defaults.baseURL = API_BASE_URL;

const MAX_INDENT = 4; // ㄴ インデントの最大段階

const CommentSection = ({ debateId, currentUser }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    // 🔥 ディシ風メンションターゲット（入力欄は1つだけ共用）
    const [replyTarget, setReplyTarget] = useState(null); // { id, author } | null

    // コメント一覧を取得
    const fetchComments = async () => {
        if (!debateId) return;
        try {
            const res = await axios.get(`/api/debates/${debateId}/comments/tree`);
            setComments(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("❌ コメント取得に失敗しました:", err);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [debateId]);

    // ログインしているかチェック
    const requireLogin = () => {
        if (!currentUser) {
            alert("ログイン後にご利用いただけます。");
            return false;
        }
        return true;
    };

    // 🔥 入力欄の変更（メンション保護ロジック）
    const handleNewCommentChange = (value) => {
        if (replyTarget) {
            const prefix = `@${replyTarget.author} `;

            // メンションモード中なのに、先頭が "@ニックネーム " ではなくなったら
            // → メンション全体を削除して通常コメントモードに戻す
            if (!value.startsWith(prefix)) {
                const bodyOnly = value.replace(/^@?\S+\s*/, ""); // 先頭の単語(@ニックネーム)を丸ごと削除
                setReplyTarget(null);
                setNewComment(bodyOnly);
                return;
            }
        }
        setNewComment(value);
    };

    // 🔥 コメント / ニックネーム / 行クリック → メンションモードに入る
    const startReplyTo = (comment) => {
        if (!requireLogin()) return;
        const author = comment.author?.trim() || "匿名";
        const prefix = `@${author} `;

        setReplyTarget({ id: comment.id, author });
        setNewComment((prev) => {
            // すでに同じ prefix が先頭にあるならそのまま、それ以外なら prefix をセット
            if (prev.startsWith(prefix)) return prev;
            return prefix;
        });
    };

    // 新規コメント / 返信コメント登録（入力欄は1つだけ共用）
    const handleSubmit = async () => {
        if (!requireLogin()) return;

        const raw = (newComment || "").trim();
        if (!raw) {
            alert("コメントを入力してください。");
            return;
        }

        const target = replyTarget;
        const isReply = !!target;
        let finalText = raw;

        if (isReply) {
            const prefix = `@${target.author} `;
            // 何かの拍子で prefix が外れていたら、通常コメントとして扱う
            if (!raw.startsWith(prefix)) {
                finalText = raw;
            }
        }

        const payload = {
            author: currentUser.username,
            text: finalText,
        };

        if (isReply) {
            // 🔥 特定のコメントに紐づく返信として登録
            payload.parentId = target.id;
        }

        try {
            await axios.post(`/api/debates/${debateId}/comments`, payload);
            setNewComment("");
            setReplyTarget(null);
            fetchComments();
        } catch (err) {
            console.error("❌ コメント登録に失敗しました:", err);
            alert(err.response?.data || "コメント登録中にエラーが発生しました。");
        }
    };

    // コメント削除
    const handleDelete = async (commentId, author) => {
        if (!requireLogin()) return;
        if (currentUser.username !== author) {
            alert("自分が書いたコメントのみ削除できます。");
            return;
        }
        if (!window.confirm("コメントを削除しますか？")) return;

        try {
            await axios.delete(`/api/debates/${debateId}/comments/${commentId}`);
            fetchComments();
        } catch (err) {
            console.error("❌ コメント削除に失敗しました:", err);
            alert(err.response?.data || "コメント削除中にエラーが発生しました。");
        }
    };

    // 日時フォーマット
    const formatTime = (iso) => {
        if (!iso) return "";
        try {
            return new Date(iso).toLocaleString("ja-JP", { hour12: false });
        } catch {
            return iso;
        }
    };

    // 1行スタイルのコメントレンダリング（再帰）
    const renderRow = (node, depth = 0) => {
        const author = node.author?.trim() || "匿名";
        const rawText = node.text?.trim();
        if (!rawText) return null;

        let mentionNick = null;
        let bodyText = rawText;
        // 先頭が @ニックネーム になっている場合を判定
        const mentionMatch = rawText.match(/^@(\S+)\s+(.*)$/);
        if (mentionMatch) {
            mentionNick = mentionMatch[1];
            bodyText = mentionMatch[2] || "";
        }

        const indentDepth = Math.min(depth, MAX_INDENT);
        const isReply = depth > 0;

        const isActiveTarget = replyTarget && replyTarget.id === node.id;

        return (
            <React.Fragment key={node.id}>
                <div
                    className={`${styles.row} ${
                        isReply ? styles.childRow : ""
                    } ${isActiveTarget ? styles.activeRow : ""}`}
                    onClick={() => startReplyTo(node)}
                >
                    {/* 左側：ニックネーム / IP */}
                    <div className={styles.leftCell}>
                        <span className={styles.nickname}>{author}</span>
                        <span className={styles.ip}>
                            ({node.ipAddress || "IP 不明"})
                        </span>
                    </div>

                    {/* 中央：メンションタグ + 本文 */}
                    <div
                        className={styles.middleCell}
                        style={
                            isReply ? { paddingLeft: indentDepth * 8 } : undefined
                        }
                    >
                        {mentionNick && (
                            <span className={styles.mentionTag}>@{mentionNick}</span>
                        )}

                        <span className={styles.text}>{bodyText}</span>
                    </div>

                    {/* 右側：時間 / 削除ボタン */}
                    <div className={styles.rightCell}>
                        <span className={styles.time}>
                            {formatTime(node.createdAt)}
                        </span>
                        {currentUser?.username === author && (
                            <button
                                type="button"
                                className={styles.deleteBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(node.id, author);
                                }}
                            >
                                X
                            </button>
                        )}
                    </div>
                </div>

                {/* 子コメント（再帰） */}
                {Array.isArray(node.replies) &&
                    node.replies.map((child) => renderRow(child, depth + 1))}
            </React.Fragment>
        );
    };

    // ルートコメント抽出（バックエンドの構造そのまま利用）
    const rootComments = Array.isArray(comments)
        ? comments.filter((c) => !c.parent)
        : [];

    return (
        <div className={styles.commentSection}>
            {/* 上部：全体件数表示 */}
            <div className={styles.headerRow}>
                <span className={styles.total}>
                    コメント {rootComments.length}件
                </span>
            </div>

            {/* コメントリスト */}
            <div className={styles.list}>
                {rootComments.length === 0 ? (
                    <div className={styles.empty}>まだコメントがありません。</div>
                ) : (
                    rootComments.map((c) => renderRow(c))
                )}
            </div>

            {/* 新規コメント / 返信コメント入力行（共用入力欄） */}
            <div className={styles.newRow}>
                <div className={styles.leftCell}>
                    <span className={styles.nickname}>
                        {currentUser?.username || "匿名"}
                    </span>
                </div>
                <div className={styles.middleCell}>
                    {/* 🔔 メンション案内バー（ディシ掲示板風） */}
                    {replyTarget?.author && (
                        <div className={styles.mentionBar}>
                            <span className={styles.mentionLabel}>
                                ↪ @{replyTarget.author} さんへの返信を作成中
                            </span>
                            <button
                                type="button"
                                className={styles.mentionClear}
                                onClick={() => {
                                    // メンションモード解除 + 先頭の単語削除
                                    setReplyTarget(null);
                                    setNewComment((prev) =>
                                        (prev || "").replace(/^@?\S+\s*/, "")
                                    );
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    <textarea
                        className={`${styles.newTextarea} ${
                            replyTarget?.author ? styles.newTextareaMention : ""
                        }`}
                        placeholder={
                            replyTarget?.author
                                ? "返信内容を入力してください..."
                                : "コメントを入力してください..."
                        }
                        value={newComment}
                        onChange={(e) => handleNewCommentChange(e.target.value)}
                    />
                </div>
                <div className={styles.rightCell}>
                    <button
                        type="button"
                        className={styles.newSubmit}
                        onClick={handleSubmit}
                    >
                        登録
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommentSection;
