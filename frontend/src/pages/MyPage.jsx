import React, { useEffect, useState } from "react";
import axios from "axios";
import styles from "./MyPage.module.css";

const MyPage = () => {
    const [activeTab, setActiveTab] = useState("profile");
    const [currentUser, setCurrentUser] = useState(null);
    const [myDebates, setMyDebates] = useState([]);
    const [password, setPassword] = useState("");
    const [newInfo, setNewInfo] = useState({ username: "", email: "" });
    const [verified, setVerified] = useState(false);

    // ✅ 로그인된 사용자 정보 가져오기
    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
            const userData = JSON.parse(savedUser);
            setCurrentUser(userData);
            setNewInfo({ username: userData.username, email: userData.email });
            fetchMyDebates(userData.username);
        }
    }, []);

    // ✅ 내가 쓴 토론글 불러오기
    const fetchMyDebates = async (username) => {
        try {
            const res = await axios.get(`http://192.168.0.21:8080/api/debates`);
            const mine = res.data.filter((d) => d.author === username);
            setMyDebates(mine);
        } catch (err) {
            console.error("❌ 내가 쓴 글 불러오기 실패:", err);
        }
    };

    // ✅ 비밀번호 확인
    const handlePasswordCheck = async () => {
        if (!password.trim()) {
            alert("비밀번호를 입력하세요.");
            return;
        }
        try {
            const res = await axios.post("http://192.168.0.21:8080/api/users/verify", {
                email: currentUser.email,
                password,
            });
            if (res.data === true) {
                alert("✅ 인증되었습니다. 회원정보를 수정할 수 있습니다.");
                setVerified(true);
            } else {
                alert("❌ 비밀번호가 일치하지 않습니다.");
            }
        } catch (err) {
            console.error("비밀번호 확인 실패:", err);
            alert("서버 오류 또는 비밀번호 불일치.");
        }
    };

    // ✅ 회원정보 수정
    const handleUpdate = async () => {
        if (!newInfo.username.trim() || !newInfo.email.trim()) {
            alert("닉네임과 이메일을 모두 입력해주세요.");
            return;
        }
        try {
            const res = await axios.put(`http://192.168.0.21:8080/api/users/update`, {
                email: currentUser.email,
                password,
                username: newInfo.username,
                newEmail: newInfo.email,
            });
            alert("✅ 회원정보가 수정되었습니다.");
            localStorage.setItem("user", JSON.stringify(res.data));
            setCurrentUser(res.data);
        } catch (err) {
            console.error(err);
            alert("수정 실패. 다시 시도해주세요.");
        }
    };

    // ✅ 로그아웃
    const handleLogout = () => {
        localStorage.removeItem("user");
        alert("로그아웃 되었습니다.");
        window.location.href = "/login";
    };

    // ✅ 토론 상태 구분 함수
    const getDebateStatus = (debate) => {
        if (debate.isClosed) return "🔒 마감된 토론";
        if (debate.rebuttalAuthor) return "⚔️ 반박중";
        return "💬 반박해보세요";
    };

    return (
        <div className={styles.container}>
            {/* ✅ 사이드바 */}
            <div className={styles.sidebar}>
                <button onClick={() => setActiveTab("profile")}>👤 마이프로필</button>
                <button onClick={() => { setActiveTab("edit"); setVerified(false); }}>⚙️ 회원정보수정</button>
                <button onClick={() => setActiveTab("posts")}>📝 내가 쓴 게시글</button>
                <button onClick={handleLogout}>🚪 로그아웃</button>
            </div>

            {/* ✅ 메인 컨텐츠 */}
            <div className={styles.content}>
                {/* 프로필 */}
                {activeTab === "profile" && currentUser && (
                    <div>
                        <h2>내 프로필</h2>
                        <p><b>닉네임:</b> {currentUser.username}</p>
                        <p><b>이메일:</b> {currentUser.email}</p>
                        <p><b>EXP:</b> {currentUser.exp}</p>
                    </div>
                )}

                {/* 회원정보 수정 */}
                {activeTab === "edit" && (
                    <div>
                        <h2>회원정보 수정</h2>

                        {!verified ? (
                            <div className={styles.verifyBox}>
                                <p>먼저 비밀번호를 입력해주세요.</p>
                                <input
                                    type="password"
                                    placeholder="비밀번호 입력"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button onClick={handlePasswordCheck}>확인</button>
                            </div>
                        ) : (
                            <div className={styles.editBox}>
                                <input
                                    type="text"
                                    value={newInfo.username}
                                    onChange={(e) =>
                                        setNewInfo({ ...newInfo, username: e.target.value })
                                    }
                                    placeholder="새 닉네임"
                                />
                                <input
                                    type="email"
                                    value={newInfo.email}
                                    onChange={(e) =>
                                        setNewInfo({ ...newInfo, email: e.target.value })
                                    }
                                    placeholder="새 이메일"
                                />
                                <button onClick={handleUpdate}>수정하기</button>
                            </div>
                        )}
                    </div>
                )}

                {/* 내가 쓴 게시글 */}
                {activeTab === "posts" && (
                    <div>
                        <h2>내가 쓴 게시글</h2>
                        {myDebates.length === 0 ? (
                            <p>작성한 게시글이 없습니다.</p>
                        ) : (
                            <ul className={styles.debateList}>
                                {myDebates.map((d) => (
                                    <li key={d.id} className={styles.debateItem}>
                                        <span className={styles.debateTitle}>{d.title}</span>
                                        <span
                                            className={`${styles.statusTag} ${
                                                d.isClosed
                                                    ? styles.closed
                                                    : d.rebuttalAuthor
                                                        ? styles.rebuttal
                                                        : styles.open
                                            }`}
                                        >
                                            {getDebateStatus(d)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyPage;
