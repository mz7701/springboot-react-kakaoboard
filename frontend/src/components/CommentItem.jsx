// 📁 src/components/CommentItem.jsx
import React from "react";
import styles from "./CommentSection.module.css";
import axios from "axios";
import { API_BASE_URL } from "../api/baseURL";   // 경로는 파일 위치에 따라 ../ 또는 ../../

axios.defaults.baseURL = API_BASE_URL;

const CommentItem = ({ comment, onReply }) => {
    return (
        <div
            className={styles.commentItem}
            style={{
                marginLeft: comment.parent ? 20 : 0,
                borderLeft: comment.parent ? "2px solid #ddd" : "none",
                paddingLeft: 10,
            }}
        >
            <p>
                <strong>{comment.author}</strong> ({comment.ipAddress})
                <span
                    onClick={() => onReply(comment.id)}
                    style={{ marginLeft: 8, color: "#007bff", cursor: "pointer" }}
                >
          💬 답글
        </span>
            </p>
            <p>{comment.text}</p>

            {/* ✅ 재귀 렌더링 부분 */}
            {comment.replies?.map((child) => (
                <CommentItem key={child.id} comment={child} onReply={onReply} />
            ))}
        </div>
    );
};

export default CommentItem;
