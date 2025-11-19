import React from "react";
import styles from "./LeftSidebar.module.css";

export default function LeftSidebar({ selectedCategory, onCategorySelect }) {
    const categories = ["전체", "게임", "사회", "연애", "스포츠", "기타"];

    return (
        <div className={styles.sidebar}>
            <h3 className={styles.title}>카테고리</h3>

            <ul className={styles.list}>
                {categories.map((cat) => (
                    <li
                        key={cat}
                        className={`${styles.item} ${
                            selectedCategory === cat ? styles.active : ""
                        }`}
                        onClick={() => onCategorySelect(cat)}
                    >
                        {cat}
                    </li>
                ))}
            </ul>
        </div>
    );
}
