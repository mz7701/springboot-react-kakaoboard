import React from "react";
import styles from "./RightSidebar.module.css";
import { useNavigate } from "react-router-dom";

export default function RightSidebar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    return (
        <div className={styles.sidebar}>
            {!user ? (
                /* 로그인 전 */
                <button
                    className={styles.loginBtn}
                    onClick={() => navigate("/login")}
                >
                    로그인
                </button>
            ) : (
                /* 로그인 후 */
                <div className={styles.userBox}>
                    <p className={styles.name}>{user.username}</p>
                    <p className={styles.exp}>EXP: {user.exp}</p>

                    {/* 로그아웃 버튼 추가 */}
                    <button
                        className={styles.logoutBtn}
                        onClick={() => {
                            localStorage.removeItem("user");
                            alert("로그아웃되었습니다.");
                            window.location.reload(); // UI 즉시 반영
                        }}
                    >
                        로그아웃
                    </button>
                </div>
            )}

            <div className={styles.hotBox}>
                <h3>인기글</h3>
                <p>인기 게시글 기능 준비중</p>
            </div>
        </div>
    );
}
