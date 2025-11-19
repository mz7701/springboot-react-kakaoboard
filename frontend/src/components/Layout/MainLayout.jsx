import React from "react";
import Header from "./Header";
import styles from "./MainLayout.module.css";

export default function MainLayout({ left, content, right }) {
    return (
        <div className={styles.wrapper}>
            {/* 상단바 */}
            <Header />

            {/* 하단 3열 레이아웃 */}
            <div className={styles.container}>
                <div className={styles.left}>{left}</div>

                <div className={styles.center}>{content}</div>

                <div className={styles.right}>{right}</div>
            </div>
        </div>
    );
}
