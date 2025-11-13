// src/components/CommentSection.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./CommentSection.module.css";

const MAX_INDENT = 4; // ㄴ 들여쓰기 최대 단계

const CommentSection = ({ debateId, currentUser }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [replyInputs, setReplyInputs] = useState({});
    const [activeReplyId, setActiveReplyId] = useState(null);

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

    // 최상위 댓글 작성
    const handleAddComment = async () => {
        if (!requireLogin()) return;
        if (!newComment.trim()) return alert("댓글을 입력해 주세요.");

        try {
            await axios.post(`/api/debates/${debateId}/comments`, {
                author: currentUser.username,
                text: newComment.trim(),
            });
            setNewComment("");
            fetchComments();
        } catch (err) {
            console.error("❌ 댓글 등록 실패:", err);
            alert(err.response?.data || "댓글 등록 중 오류가 발생했습니다.");
        }
    };

    // 대댓글 작성
    const handleReplySubmit = async (parentId) => {
        if (!requireLogin()) return;
        const text = replyInputs[parentId];
        if (!text || !text.trim()) return alert("대댓글을 입력해 주세요.");

        try {
            await axios.post(`/api/debates/${debateId}/comments`, {
                author: currentUser.username,
                text: text.trim(),
                parentId,
            });
            setReplyInputs((prev) => ({ ...prev, [parentId]: "" }));
            setActiveReplyId(null);
            fetchComments();
        } catch (err) {
            console.error("❌ 대댓글 등록 실패:", err);
            alert(err.response?.data || "대댓글 등록 중 오류가 발생했습니다.");
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
    const renderRow = (node, depth = 0) => {
        const author = node.author?.trim() || "익명";
        const text = node.text?.trim();
        if (!text) return null;

        const indentDepth = Math.min(depth, MAX_INDENT);
        const isReply = depth > 0;
        return (
            <React.Fragment key={node.id}>
                {/* 한 줄 댓글 */}
                <div className={`${styles.row} ${isReply ? styles.childRow : ""}`}>

                {/* 왼쪽: 닉네임 / IP */}
                    <div className={styles.leftCell}>
                        <span className={styles.nickname}>{author}</span>
                        <span className={styles.ip}>
                            ({node.ipAddress || "IP 미확인"})
                        </span>
                    </div>

                    {/* 가운데: ㄴ 들여쓰기 + 내용 + 답글 버튼 */}
                    <div
                        className={styles.middleCell}
                        style={isReply ? { paddingLeft: indentDepth * 8 } : undefined}
                    >
                        {depth > 0 && (
                            <span className={styles.depthMarker}>
                                {"ㄴ ".repeat(indentDepth)}
                            </span>
                        )}
                        <span className={styles.text}>{text}</span>
                        <button
                            type="button"
                            className={styles.replyLink}
                            onClick={() => {
                                setActiveReplyId(
                                    activeReplyId === node.id ? null : node.id
                                );
                                setReplyInputs((prev) => ({
                                    ...prev,
                                    [node.id]:
                                        prev[node.id] ||
                                        `@${author} `,
                                }));
                            }}
                        >
                            답글
                        </button>
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
                                onClick={() => handleDelete(node.id, author)}
                            >
                                X
                            </button>
                        )}
                    </div>
                </div>

                {/* 대댓글 입력 줄 */}
                {activeReplyId === node.id && (
                    <div className={styles.replyRow}>
                        <div className={styles.leftCell} />
                        <div className={styles.middleCell}>
                            <textarea
                                className={styles.replyTextarea}
                                placeholder={`@${author}님에게 답글`}
                                value={replyInputs[node.id] || ""}
                                onChange={(e) =>
                                    setReplyInputs((prev) => ({
                                        ...prev,
                                        [node.id]: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className={styles.rightCell}>
                            <button
                                type="button"
                                className={styles.replySubmit}
                                onClick={() => handleReplySubmit(node.id)}
                            >
                                등록
                            </button>
                        </div>
                    </div>
                )}

                {/* 자식들 재귀 */}
                {Array.isArray(node.replies) &&
                    node.replies.map((child) => renderRow(child, depth + 1))}
            </React.Fragment>
        );
    };

    const rootComments = Array.isArray(comments)
        ? comments.filter((c) => !c.parent)
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

            {/* 새 댓글 작성 줄 (맨 아래) */}
            <div className={styles.newRow}>
                <div className={styles.leftCell}>
                    <span className={styles.nickname}>
                        {currentUser?.username || "익명"}
                    </span>
                </div>
                <div className={styles.middleCell}>
                    <textarea
                        className={styles.newTextarea}
                        placeholder="댓글을 입력하세요..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                    />
                </div>
                <div className={styles.rightCell}>
                    <button
                        type="button"
                        className={styles.newSubmit}
                        onClick={handleAddComment}
                    >
                        등록
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommentSection;
