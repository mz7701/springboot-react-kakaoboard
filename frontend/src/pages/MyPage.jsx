import React, { useEffect, useState } from "react";
import axios from "axios";
import styles from "./MyPage.module.css";
import CommentSection from "../components/CommentSection";

axios.defaults.baseURL = "http://192.168.0.21:8080";
axios.defaults.headers.post["Content-Type"] = "application/json";

const MyPage = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState("info");
    const [editForm, setEditForm] = useState({ nickname: "", email: "", password: "" });
    const [myDebates, setMyDebates] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [verified, setVerified] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [emailSent, setEmailSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState("");

    /** ✅ 로그인 유저 불러오기 */
    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) {
            const user = JSON.parse(stored);
            setCurrentUser(user);
            setEditForm({ nickname: user.username, email: user.email || "", password: "" });
            fetchMyDebates(user.username);
        }
    }, []);

    /** ✅ 내가 쓴 토론 불러오기 */
    const fetchMyDebates = async (username) => {
        if (!username) return;
        try {
            const res = await axios.get("/api/debates");
            const filtered = res.data.filter((d) => d.author === username);
            filtered.sort((a, b) => {
                if (a.isClosed === b.isClosed) return b.id - a.id;
                return a.isClosed ? 1 : -1;
            });
            setMyDebates(filtered);
        } catch (err) {
            console.error("❌ 내 토론 불러오기 실패:", err);
        }
    };

    /** ✅ 이메일 인증번호 전송 */
    const handleSendCode = async () => {
        if (!editForm.email) return alert("이메일을 입력해주세요.");
        try {
            const res = await axios.post("http://192.168.0.21:8080/api/auth/send-code-edit", null, {
                params: { email: editForm.email },
            });

            if (res.status === 200) {
                alert("인증번호가 전송되었습니다!");
                setEmailSent(true);
            }
        } catch (err) {
            console.error("❌ 인증번호 전송 실패:", err);
            alert("이메일 전송 중 오류가 발생했습니다.");
        }
    };

    /** ✅ 인증번호 검증 */
    const handleVerifyCode = async () => {
        if (!verificationCode) return alert("인증번호를 입력해주세요.");
        try {
            const res = await axios.post("http://192.168.0.21:8080/api/auth/verify-code-edit", null, {
                params: { email: editForm.email, code: verificationCode },
            });


            if (typeof res.data === "string" && res.data.includes("성공")) {
                setVerified(true);
                alert("✅ 이메일 인증 완료!");
            } else {
                alert("❌ 인증번호가 올바르지 않습니다.");
            }
        } catch (err) {
            console.error("인증 실패:", err);
        }
    };

    /** ✅ 회원정보 수정 */
    const handleUpdate = async () => {
        if (!editForm.nickname.trim()) return alert("닉네임을 입력해주세요.");
        if (!verified) return alert("이메일 인증을 완료해주세요.");
        if (editForm.password !== confirmPassword) {
            return alert("비밀번호가 일치하지 않습니다.");
        }
        if (editForm.password && !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/.test(editForm.password)) {
            return alert("비밀번호는 영어, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.");
        }

        try {
            setLoading(true);
            const res = await axios.put(
                `/api/users/update/${currentUser.id}`,
                {
                    username: editForm.nickname,
                    email: editForm.email,
                    password: editForm.password || null,
                },
                { headers: { "Content-Type": "application/json" } }
            );


            alert("✅ 회원정보가 수정되었습니다.");
            localStorage.setItem("user", JSON.stringify(res.data));
            setCurrentUser(res.data);
            setVerified(false);
        } catch (err) {
            console.error("❌ 회원정보 수정 실패:", err);
            alert("수정 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

    return (
        <div className={styles.container}>
            {/* ✅ 왼쪽 탭 (Sidebar) */}
            <aside className={styles.sidebar}>
                <h2 className={styles.sidebarTitle}>마이페이지</h2>
                <button
                    className={`${styles.tabButton} ${activeTab === "info" ? styles.active : ""}`}
                    onClick={() => setActiveTab("info")}
                >
                    내 정보
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === "edit" ? styles.active : ""}`}
                    onClick={() => setActiveTab("edit")}
                >
                    정보 수정
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === "posts" ? styles.active : ""}`}
                    onClick={() => setActiveTab("posts")}
                >
                    내가 쓴 토론
                </button>
            </aside>

            {/* ✅ 오른쪽 내용 */}
            <main className={styles.content}>
                {/* 내 정보 */}
                {activeTab === "info" && currentUser && (
                    <section className={styles.infoSection}>
                        <h3>👤 내 정보</h3>
                        <p><b>닉네임:</b> {currentUser.username}</p>
                        <p><b>이메일:</b> {currentUser.email}</p>
                        <p><b>EXP:</b> {currentUser.exp || 0}</p>
                    </section>
                )}

                {/* 정보 수정 */}
                {activeTab === "edit" && (
                    <section className={styles.editSection}>
                        <h3>✏️ 정보 수정</h3>
                        <div className={styles.inputGroup}>
                            <label>닉네임</label>
                            <input
                                type="text"
                                value={editForm.nickname}
                                onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                            />
                        </div>



                        <div className={styles.inputGroup}>
                            <label>이메일</label>
                            <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            />
                            {!verified && (
                                <button onClick={handleSendCode} className={styles.smallButton}>
                                    인증번호 전송
                                </button>
                            )}
                        </div>

                        {emailSent && !verified && (
                            <div className={styles.inputGroup}>
                                <label>인증번호 입력</label>
                                <input
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                />
                                <button onClick={handleVerifyCode} className={styles.smallButton}>
                                    인증 확인
                                </button>
                            </div>
                        )}

                        <div className={styles.inputGroup}>
                            <label>새 비밀번호</label>
                            <input
                                type="password"
                                value={editForm.password}
                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                placeholder="영문+숫자 8자 이상"
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>비밀번호 확인</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="비밀번호를 다시 입력하세요"
                            />
                        </div>

                        <button onClick={handleUpdate} disabled={loading} className={styles.updateButton}>
                            {loading ? "수정 중..." : "수정하기"}
                        </button>
                    </section>
                )}

                {/* 내가 쓴 토론 */}
                {activeTab === "posts" && (
                    <section className={styles.postSection}>
                        <h3>🧾 내가 쓴 토론</h3>
                        {myDebates.length === 0 ? (
                            <p>작성한 토론이 없습니다.</p>
                        ) : (
                            myDebates.map((debate) => (
                                <div key={debate.id} className={styles.debateCard}>
                                    <div
                                        className={styles.debateHeader}
                                        onClick={() => toggleExpand(debate.id)}
                                    >
                                        <h4>{debate.title}</h4>
                                        <span>{expandedId === debate.id ? "▲" : "▼"}</span>
                                    </div>

                                    {expandedId === debate.id && (
                                        <div className={styles.debateContent}>
                                            <p>{debate.content}</p>

                                            {debate.rebuttalTitle && (
                                                <div className={styles.rebuttalBox}>
                                                    <h4>🗣️ {debate.rebuttalTitle}</h4>
                                                    <p>{debate.rebuttalContent}</p>
                                                    <p className={styles.rebuttalMeta}>- {debate.rebuttalAuthor}</p>
                                                </div>
                                            )}

                                            {debate.isClosed && (
                                                <div className={styles.resultBox}>
                                                    {debate.winner === "draw" ? (
                                                        <p>🤝 무승부</p>
                                                    ) : (
                                                        <p>
                                                            🏆 승자:{" "}
                                                            {debate.winner === "author"
                                                                ? debate.author
                                                                : debate.rebuttalAuthor}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* ✅ 댓글 섹션 */}
                                            <CommentSection
                                                debateId={debate.id}
                                                currentUser={currentUser}
                                                refresh={() => fetchMyDebates(currentUser.username)}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </section>
                )}
            </main>
        </div>
    );
};

export default MyPage;
