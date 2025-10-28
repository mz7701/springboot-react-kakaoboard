import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, Clock } from "lucide-react";
import styles from "../pages/DebateBoard.module.css";

const DebateCard = ({ debate }) => {
    const [likes, setLikes] = useState(debate.likes || 0);
    const [dislikes, setDislikes] = useState(debate.dislikes || 0);

    const handleLike = () => setLikes((prev) => prev + 1);
    const handleDislike = () => setDislikes((prev) => prev + 1);

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3>{debate.title}</h3>
                <div className={styles.author}>
                    <span>✍ {debate.author}</span>
                </div>
            </div>

            <p className={styles.content}>{debate.content}</p>

            <div className={styles.footer}>
                <div className={styles.stats}>
                    <button className={styles.btn} onClick={handleLike}>
                        <ThumbsUp size={16} /> {likes}
                    </button>
                    <button className={styles.btn} onClick={handleDislike}>
                        <ThumbsDown size={16} /> {dislikes}
                    </button>
                    <div className={styles.comment}>
                        <MessageSquare size={16} /> {debate.comments?.length || 0}
                    </div>
                </div>
                <div className={styles.time}>
                    <Clock size={14} />
                    <span>
            {debate.createdAt
                ? new Date(debate.createdAt).toLocaleString()
                : "방금 전"}
          </span>
                </div>
            </div>
        </div>
    );
};

export default DebateCard;
