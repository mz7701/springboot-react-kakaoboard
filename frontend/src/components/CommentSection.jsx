import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./CommentSection.module.css";

const CommentSection = ({ debateId, currentUser }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [replyInputs, setReplyInputs] = useState({});
    const [mentionTarget, setMentionTarget] = useState(null);

    // 🔽 추가: 댓글 영역 열림/닫힘 상태
    const [isOpen, setIsOpen] = useState(false);
    const MAX_INDENT = 3;
    /** ✅ 댓글 트리 불러오기 */
    const fetchComments = async () => {
        try {
            const res = await axios.get(`/api/debates/${debateId}/comments/tree`);
            if (Array.isArray(res.data)) setComments(res.data);
            else setComments([]);
        } catch (err) {
            console.error("❌ 댓글 불러오기 실패:", err);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [debateId]);

    /** ✅ 새 댓글 추가 */
    const handleAddComment = async () => {
        if (!newComment.trim()) return alert("댓글을 입력하세요!");
        try {
            await axios.post(
                `http://192.168.0.21:8080/api/debates/${debateId}/comments`,
                {
                    author: currentUser?.username || "익명",
                    text: newComment.trim(),
                }
            );
            setNewComment("");
            fetchComments();
        } catch (err) {
            console.error("댓글 등록 실패:", err);
        }
    };

    /** ✅ 대댓글 추가 */
    const handleReply = async (parentId) => {
        const text = replyInputs[parentId]?.trim();
        if (!text) return alert("대댓글을 입력하세요!");

        try {
            await axios.post(
                `http://192.168.0.21:8080/api/debates/${debateId}/comments`,
                {
                    author: currentUser?.username || "익명",
                    text,
                    parentId, // ✅ 부모 댓글 ID
                }
            );
            setReplyInputs((prev) => ({ ...prev, [parentId]: "" }));
            fetchComments();
        } catch (err) {
            console.error("대댓글 등록 실패:", err);
        }
    };

    /** ✅ 댓글 삭제 */
    const handleDelete = async (commentId) => {
        if (!window.confirm("정말 삭제하시겠습니까?")) return;
        try {
            await axios.delete(
                `http://192.168.0.21:8080/api/debates/${debateId}/comments/${commentId}`
            );
            fetchComments();
        } catch (err) {
            console.error("댓글 삭제 실패:", err);
        }
    };

    /** ✅ 닉네임 클릭 → 언급 */
    const handleMentionClick = (nickname, id) => {
        setMentionTarget({ nickname, id });
        setReplyInputs((prev) => ({
            ...prev,
            [id]: `@${nickname}님 `,
        }));
    };

    /** ✅ 댓글 렌더링 (무한 대댓글) */
    const renderComment = (node, depth = 0) => {
        const author = node.author?.trim() || "익명";
        const text = node.text?.trim();
        if (!text) return null;

        return (
            <div
                key={node.id}
                className={styles.commentBox}
                style={{ marginLeft: depth * 24 }}
            >
                {/* 상단 정보 */}
                <div className={styles.commentHeader}>
                    <span
                        className={styles.author}
                        onClick={() => handleMentionClick(author, node.id)}
                    >
                        {author}
                    </span>
                    {node.ipAddress ? (
                        <span className={styles.ip}> ({node.ipAddress})</span>
                    ) : (
                        <span className={styles.ip}> (IP 미확인)</span>
                    )}
                    <span className={styles.time}>
                        {new Date(node.createdAt).toLocaleString("ko-KR")}
                    </span>
                </div>

                {/* 댓글 본문 */}
                <div className={styles.commentBody}>{text}</div>

                {/* 액션 버튼 */}
                <div className={styles.commentActions}>
                    <button
                        onClick={() =>
                            setReplyInputs((prev) => ({
                                ...prev,
                                [node.id]: prev[node.id] ? "" : `@${author}님 `,
                            }))
                        }
                    >
                        💬 답글
                    </button>

                    {currentUser?.username === author && (
                        <button
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(node.id)}
                        >
                            ❌ 삭제
                        </button>
                    )}
                </div>

                {/* ✅ 대댓글 입력창 */}
                {replyInputs[node.id] !== undefined && (
                    <div className={styles.replyInput}>
                        <input
                            type="text"
                            placeholder={`@${author}님에게 답글`}
                            value={replyInputs[node.id]}
                            onChange={(e) =>
                                setReplyInputs((prev) => ({
                                    ...prev,
                                    [node.id]: e.target.value,
                                }))
                            }
                        />
                        <button onClick={() => handleReply(node.id)}>등록</button>
                    </div>
                )}

                {/* ✅ 재귀 렌더링 (무한 대댓글) */}
                {Array.isArray(node.replies) &&
                    node.replies
                        .filter((child) => !child.parent || child.parent.id === node.id)
                        .map((child) => renderComment(child, depth + 1))}
            </div>
        );
    };

    /** ✅ 루트 댓글만 렌더링 */
    const rootComments = Array.isArray(comments)
        ? comments.filter((c) => !c.parent)
        : [];

    return (
        <div className={styles.commentSection}>
            {/* 🔽 여기 클릭하면 열리고 닫힘 */}
            <button
                type="button"
                className={styles.commentToggle}
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <span className={styles.commentToggleLeft}>
                    💬 댓글
                    {rootComments.length > 0 && (
                        <span className={styles.commentCount}>
                            {rootComments.length}
                        </span>
                    )}
                </span>
                <span className={styles.chevron}>{isOpen ? "▲" : "▼"}</span>
            </button>

            {/* 열려 있을 때만 목록 + 입력창 보이게 */}
            {isOpen && (
                <>
                    {rootComments.length > 0 ? (
                        rootComments.map((c) => renderComment(c))
                    ) : (
                        <p className={styles.noComment}>아직 댓글이 없습니다.</p>
                    )}

                    <div className={styles.addComment}>
                        <input
                            type="text"
                            placeholder="댓글을 입력하세요..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                        <button onClick={handleAddComment}>등록</button>
                    </div>
                </>
            )}
        </div>
    );
};

export default CommentSection;
