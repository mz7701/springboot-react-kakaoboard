import React, { useState, useRef, useEffect } from "react";
import styles from "./AppleGamePage.module.css";
import axios from "axios";
import { API_BASE_URL } from "../api/baseURL";   // 경로는 파일 위치에 따라 ../ 또는 ../../

axios.defaults.baseURL = API_BASE_URL;

const GRID_COLS = 17;
const GRID_ROWS = 10;
const TOTAL_TIME = 120;

export default function AppleGamePage() {
    const [grid, setGrid] = useState([]);
    const [score, setScore] = useState(0);
    const [remainingTime, setRemainingTime] = useState(TOTAL_TIME);
    const [gameRunning, setGameRunning] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [popping, setPopping] = useState([]); // 💥 터지는 인덱스 추적

    const selectionRef = useRef(null);
    const modalRef = useRef(null);
    const finalScoreRef = useRef(null);
    const gridRef = useRef(null);

    const timer = useRef(null);
    const startPos = useRef({ x: 0, y: 0 });

    /** ✅ 그리드 초기화 */
    const createGrid = () => {
        const arr = [];
        for (let i = 0; i < GRID_ROWS * GRID_COLS; i++) {
            arr.push(Math.floor(Math.random() * 9) + 1);
        }
        setGrid(arr);
    };

    /** ✅ 타이머 */
    const startTimer = () => {
        setRemainingTime(TOTAL_TIME);
        timer.current = setInterval(() => {
            setRemainingTime((prev) => {
                if (prev <= 1) {
                    clearInterval(timer.current);
                    endGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    /** ✅ 게임 시작 */
    const startGame = () => {
        createGrid();
        setScore(0);
        setGameRunning(true);
        modalRef.current.classList.add(styles.hidden);
        startTimer();
    };

    /** ✅ 게임 종료 */
    const endGame = () => {
        setGameRunning(false);
        clearInterval(timer.current);
        modalRef.current.classList.remove(styles.hidden);
        finalScoreRef.current.textContent = score;
    };

    /** ✅ 드래그 영역 계산 */
    const getSelectionRect = (e) => {
        const { x, y } = startPos.current;
        return {
            left: Math.min(x, e.clientX),
            right: Math.max(x, e.clientX),
            top: Math.min(y, e.clientY),
            bottom: Math.max(y, e.clientY),
        };
    };

    /** ✅ 마우스 이벤트 */
    const handleMouseDown = (e) => {
        if (!gameRunning) return;
        setIsDragging(true);
        startPos.current = { x: e.clientX, y: e.clientY };
        selectionRef.current.classList.remove(styles.hidden);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const rect = getSelectionRect(e);
        const gridRect = gridRef.current.getBoundingClientRect();

        selectionRef.current.style.left = `${rect.left - gridRect.left}px`;
        selectionRef.current.style.top = `${rect.top - gridRect.top}px`;
        selectionRef.current.style.width = `${rect.right - rect.left}px`;
        selectionRef.current.style.height = `${rect.bottom - rect.top}px`;
    };

    const handleMouseUp = (e) => {
        if (!isDragging) return;
        setIsDragging(false);
        selectionRef.current.classList.add(styles.hidden);

        const rect = getSelectionRect(e);
        const apples = Array.from(gridRef.current.children);
        let sum = 0;
        const selected = [];

        apples.forEach((apple, i) => {
            const aRect = apple.getBoundingClientRect();
            const cx = aRect.left + aRect.width / 2;
            const cy = aRect.top + aRect.height / 2;
            if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
                sum += parseInt(apple.dataset.value);
                selected.push(i);
            }
        });

        if (sum === 10 && selected.length > 0) {
            // 💥 pop 애니메이션 실행
            setPopping(selected);

            setTimeout(() => {
                // 💨 사과를 실제로 제거 (빈칸으로)
                setGrid((prev) => {
                    const updated = [...prev];
                    selected.forEach((i) => (updated[i] = null)); // 🍎 null → 완전히 빈칸 처리
                    return updated;
                });
                setScore((prev) => prev + selected.length);
                setPopping([]); // pop 상태 해제
            }, 500); // 애니메이션 시간과 일치
        }
    };

    /** ✅ 정리 */
    useEffect(() => {
        return () => clearInterval(timer.current);
    }, []);

    const timerPercent = (remainingTime / TOTAL_TIME) * 100;

    return (
        <div className={styles.container}>
            <div className={styles.sidebar}>
                <h1 className={styles.title}>🍎 사과게임</h1>
                <p>점수: {score}</p>
                <p>남은 시간: {remainingTime}s</p>
                <div className={styles.timerContainer}>
                    <div
                        className={styles.timerBar}
                        style={{ width: `${timerPercent}%` }}
                    ></div>
                </div>
                <button onClick={startGame} className={styles.btn}>
                    🎮 게임 시작
                </button>
                <button onClick={endGame} className={styles.btn}>
                    🛑 종료
                </button>
            </div>

            {/* ✅ 그리드 */}
            <div
                ref={gridRef}
                className={styles.grid}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                {grid.map((val, i) => (
                    <div
                        key={i}
                        data-value={val ?? ""}
                        className={`${styles.apple}
              ${val == null ? styles.empty : ""}
              ${popping.includes(i) ? styles.pop : ""}`}
                    >
                        {val != null ? val : ""}
                    </div>
                ))}
                <div
                    ref={selectionRef}
                    className={`${styles.selectionBox} ${styles.hidden}`}
                ></div>
            </div>

            {/* ✅ 결과 모달 */}
            <div ref={modalRef} className={`${styles.modal} ${styles.hidden}`}>
                <div className={styles.modalContent}>
                    <h1>게임 종료!</h1>
                    <p>최종 점수: <span ref={finalScoreRef}>{score}</span></p>
                    <button onClick={startGame} className={styles.btn}>
                        🔁 다시하기
                    </button>
                </div>
            </div>
        </div>
    );
}
