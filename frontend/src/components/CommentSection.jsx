// src/components/CommentSection.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./CommentSection.module.css";

const MAX_INDENT = 4; // ㄴ 들여쓰기 최대 단계

const CommentSection = ({ debateId, currentUser }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    // 🔥 디시 스타일 멘션 타겟 (전체 입력창 1개만 사용)
    const [replyTarget, setReplyTarget] = useState(null); // { id, author } | null

    // 댓글 목록 불러오기
    const fetchComments = async () => {
        if (!debateId) return;
        try {
            const res = await axios.get(`/api/debates/${debateId}/comments/tree`);
            setComments(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("❌ 댓글 불러오기 실패:", err);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [debateId]);

    const requireLogin = () => {
        if (!currentUser) {
            alert("로그인 후 이용 가능합니다.");
            return false;
        }
        return true;
    };

    // 🔥 입력창 변경 (멘션 보호 로직)
    const handleNewCommentChange = (value) => {
        if (replyTarget) {
            const prefix = `@${replyTarget.author} `;

            // 멘션 모드인데, 맨 앞이 더 이상 "@닉네임 " 이 아니면 → 멘션 전체 제거 + 일반 댓글로 전환
            if (!value.startsWith(prefix)) {
                const bodyOnly = value.replace(/^@?\S+\s*/, ""); // 맨 앞 단어(@닉네임) 통째 삭제
                setReplyTarget(null);
                setNewComment(bodyOnly);
                return;
            }
        }
        setNewComment(value);
    };

    // 🔥 댓글/닉네임/답글 클릭 시 → 멘션 모드 진입
    const startReplyTo = (comment) => {
        if (!requireLogin()) return;
        const author = comment.author?.trim() || "익명";
        const prefix = `@${author} `;

        setReplyTarget({ id: comment.id, author });
        setNewComment((prev) => {
            // 기존에 같은 prefix 있으면 그대로 두고, 아니면 prefix로 세팅
            if (prev.startsWith(prefix)) return prev;
            return prefix;
        });
    };

    // 최상위/대댓글 등록 (입력창 1개만 사용)
    const handleSubmit = async () => {
        if (!requireLogin()) return;

        const raw = (newComment || "").trim();
        if (!raw) {
            alert("댓글을 입력해 주세요.");
            return;
        }

        const target = replyTarget;
        const isReply = !!target;
        let finalText = raw;

        if (isReply) {
            const prefix = `@${target.author} `;
            // 혹시 뭔가 꼬여서 prefix가 안 붙어 있으면 그냥 일반 댓글 취급
            if (!raw.startsWith(prefix)) {
                finalText = raw;
            }
        }

        const payload = {
            author: currentUser.username,
            text: finalText,
        };

        if (isReply) {
            payload.parentId = target.id; // 🔥 특정 댓글에 정확히 attach
        }

        try {
            await axios.post(`/api/debates/${debateId}/comments`, payload);
            setNewComment("");
            setReplyTarget(null);
            fetchComments();
        } catch (err) {
            console.error("❌ 댓글 등록 실패:", err);
            alert(err.response?.data || "댓글 등록 중 오류가 발생했습니다.");
        }
    };

    // 댓글 삭제
    const handleDelete = async (commentId, author) => {
        if (!requireLogin()) return;
        if (currentUser.username !== author) {
            alert("자신이 작성한 댓글만 삭제할 수 있습니다.");
            return;
        }
        if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

        try {
            await axios.delete(`/api/debates/${debateId}/comments/${commentId}`);
            fetchComments();
        } catch (err) {
            console.error("❌ 댓글 삭제 실패:", err);
            alert(err.response?.data || "댓글 삭제 중 오류가 발생했습니다.");
        }
    };

    const formatTime = (iso) => {
        if (!iso) return "";
        try {
            return new Date(iso).toLocaleString("ko-KR", { hour12: false });
        } catch {
            return iso;
        }
    };

    // 한 줄 스타일 댓글 렌더링 (재귀)
    // 한 줄 스타일 댓글 렌더링 (재귀)
    const renderRow = (node, depth = 0) => {
        const author = node.author?.trim() || "익명";
        const rawText = node.text?.trim();
        if (!rawText) return null;

        let mentionNick = null;
        let bodyText = rawText;
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
                    {/* 왼쪽: 닉네임 / IP */}
                    <div className={styles.leftCell}>
                        <span className={styles.nickname}>{author}</span>
                        <span className={styles.ip}>
                        ({node.ipAddress || "IP 미확인"})
                    </span>
                    </div>

                    {/* 가운데: 멘션 태그 + 내용 + 답글 버튼 (ㄴ 제거) */}
                    <div
                        className={styles.middleCell}
                        style={
                            isReply ? { paddingLeft: indentDepth * 8 } : undefined
                        }
                    >
                        {/* 🔥 여기 있던 depthMarker(ㄴ 반복) 부분 통째로 삭제 */}

                        {mentionNick && (
                            <span className={styles.mentionTag}>@{mentionNick}</span>
                        )}

                        <span className={styles.text}>{bodyText}</span>

                    </div>

                    {/* 오른쪽: 시간 / X 버튼 */}
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

                {Array.isArray(node.replies) &&
                    node.replies.map((child) => renderRow(child, depth + 1))}
            </React.Fragment>
        );
    };


    const rootComments = Array.isArray(comments)
        ? comments.filter((c) => !c.parent) // 백엔드 구조 그대로 사용
        : [];

    return (
        <div className={styles.commentSection}>
            {/* 상단: 전체 개수 표시 */}
            <div className={styles.headerRow}>
                <span className={styles.total}>
                    전체 댓글 {rootComments.length}개
                </span>
            </div>

            {/* 댓글 리스트 */}
            <div className={styles.list}>
                {rootComments.length === 0 ? (
                    <div className={styles.empty}>아직 댓글이 없습니다.</div>
                ) : (
                    rootComments.map((c) => renderRow(c))
                )}
            </div>

            {/* 새 댓글 / 대댓글 입력 줄 (공용 입력창) */}
            <div className={styles.newRow}>
                <div className={styles.leftCell}>
                    <span className={styles.nickname}>
                        {currentUser?.username || "익명"}
                    </span>
                </div>
                <div className={styles.middleCell}>

                    {/* 🔔 멘션 안내 바 (디시 느낌) */}
                    {replyTarget?.author && (
                        <div className={styles.mentionBar}>
                            <span className={styles.mentionLabel}>
                                ↪ @{replyTarget.author} 님에게 답글 작성 중
                            </span>
                            <button
                                type="button"
                                className={styles.mentionClear}
                                onClick={() => {
                                    // 멘션 모드 해제 + 맨 앞 단어 제거
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
                                ? "답글 내용을 입력하세요..."
                                : "댓글을 입력하세요..."
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
                        등록
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommentSection;
