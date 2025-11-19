import React from "react";
import styles from "./Header.module.css";
import { useNavigate } from "react-router-dom";

export default function Header() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user")); // ← user 객체 가져오기

    return (
        <header className={styles.header}>

            {/* 로고 */}
            <div className={styles.logo}>🔥 토론의 전당 🔥</div>

            {/* 검색 */}
            <div className={styles.searchBox}>
                <input type="text" placeholder="게시글 제목 검색..." />
            </div>

            {/* 로그인 / 내정보(마이페이지) */}
            <div className={styles.right}>
                {!user ? (
                    /* 로그인 안했을 때 (로그인 버튼 표시) */
                    <button
                        className={styles.loginBtn}
                        onClick={() => navigate("/login")}
                    >
                        로그인
                    </button>
                ) : (
                    /* 로그인 했을 때 (내 정보 버튼 표시) */
                    <button
                        className={styles.loginBtn}
                        onClick={() => navigate("/mypage")}
                    >
                        내 정보
                    </button>
                )}
            </div>

        </header>
    );
}
