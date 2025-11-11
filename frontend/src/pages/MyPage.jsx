import React, { useEffect, useState } from "react";
import axios from "axios";
import styles from "./MyPage.module.css";

const MyPage = () => {
    const [activeTab, setActiveTab] = useState("profile");
    const [currentUser, setCurrentUser] = useState(null);
    const [password, setPassword] = useState("");
    const [verified, setVerified] = useState(false);
    const [form, setForm] = useState({
        username: "",
        email: "",
        newPassword: "",
        newPasswordCheck: "",
    });
    const [emailCode, setEmailCode] = useState("");
    const [emailSent, setEmailSent] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [myDebates, setMyDebates] = useState([]);
    const [expandedId, setExpandedId] = useState(null); // ✅ 토글용 상태 추가

    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
            const userData = JSON.parse(savedUser);
            setCurrentUser(userData);
            setForm({
                username: userData.username,
                email: userData.email,
                newPassword: "",
                newPasswordCheck: "",
            });
            fetchMyDebates(userData.username);
        }
    }, []);

    /** ✅ 내가 쓴 게시글 불러오기 */
    const fetchMyDebates = async (username) => {
        try {
            const res = await axios.get("http://192.168.0.21:8080/api/debates");
            const mine = res.data.filter((d) => d.author === username);
            // ✅ 정렬: 반박해보세요 → 반박중 → 마감된토론
            const sorted = mine.sort((a, b) => {
                const order = (debate) => {
                    if (debate.isClosed) return 3; // 마감된 토론
                    if (debate.rebuttalAuthor) return 2; // 반박중
                    return 1; // 반박해보세요
                };
                return order(a) - order(b);
            });
            setMyDebates(sorted);
        } catch (err) {
            console.error("❌ 내가 쓴 글 불러오기 실패:", err);
        }
    };

    /** ✅ 비밀번호 확인 */
    const handlePasswordCheck = async () => {
        try {
            const res = await axios.post("http://192.168.0.21:8080/api/users/verify", {
                email: currentUser.email,
                password,
            });
            if (res.data === true) {
                setVerified(true);
                alert("비밀번호 인증 성공! 수정이 가능합니다.");
            } else {
                alert("비밀번호가 일치하지 않습니다.");
            }
        } catch (err) {
            alert("서버 오류 또는 비밀번호 불일치");
        }
    };

    /** ✅ 이메일 인증번호 전송 */
    const handleSendEmailCode = async () => {
        if (!form.email.trim()) return alert("이메일을 입력해주세요.");
        try {
            await axios.post("http://192.168.0.21:8080/api/users/send-code", {
                email: form.email,
            });
            setEmailSent(true);
            alert("인증번호를 이메일로 전송했습니다!");
        } catch (err) {
            alert("이메일 전송 실패");
        }
    };

    /** ✅ 인증번호 확인 */
    const handleVerifyEmail = async () => {
        try {
            const res = await axios.post("http://192.168.0.21:8080/api/users/verify-code", {
                email: form.email,
                code: emailCode,
            });
            if (res.data === true) {
                setEmailVerified(true);
                alert("이메일 인증 성공!");
            } else alert("인증번호가 올바르지 않습니다.");
        } catch {
            alert("서버 오류 발생");
        }
    };

    /** ✅ 비밀번호 유효성 검사 */
    const isValidPassword = (pw) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(pw);

    /** ✅ 회원정보 수정 */
    const handleUpdate = async () => {
        if (!verified) return alert("비밀번호 인증을 먼저 진행해주세요.");
        if (!emailVerified) return alert("이메일 인증을 완료해주세요.");
        if (form.newPassword && !isValidPassword(form.newPassword))
            return alert("비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다.");
        if (form.newPassword !== form.newPasswordCheck)
            return alert("비밀번호 확인이 일치하지 않습니다.");

        try {
            const res = await axios.put("http://192.168.0.21:8080/api/users/update", {
                email: currentUser.email,
                username: form.username,
                newEmail: form.email,
                newPassword: form.newPassword,
            });
            alert("회원정보가 수정되었습니다!");
            localStorage.setItem("user", JSON.stringify(res.data));
            setCurrentUser(res.data);
        } catch (err) {
            alert("수정 실패: " + (err.response?.data || "서버 오류"));
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        window.location.href = "/login";
    };

    /** ✅ 게시글 상태 텍스트 */
    const getDebateStatus = (debate) => {
        if (debate.isClosed) return "🔒 마감된 토론";
        if (debate.rebuttalAuthor) return "⚔️ 반박중";
        return "💬 반박해보세요";
    };

    /** ✅ 게시글 제목 클릭 시 상세내용 토글 */
    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className={styles.container}>
            <div className={styles.sidebar}>
                <button onClick={() => setActiveTab("profile")}>👤 내 정보</button>
                <button onClick={() => setActiveTab("edit")}>⚙️ 정보 수정</button>
                <button onClick={() => setActiveTab("posts")}>📝 내가 쓴 게시글</button>
                <button onClick={handleLogout}>🚪 로그아웃</button>
            </div>

            <div className={styles.content}>
                {/* ✅ 내 프로필 */}
                {activeTab === "profile" && currentUser && (
                    <div>
                        <h2>내 프로필</h2>
                        <p><b>닉네임:</b> {currentUser.username}</p>
                        <p><b>이메일:</b> {currentUser.email}</p>
                    </div>
                )}

                {/* ✅ 회원정보 수정 */}
                {activeTab === "edit" && (
                    <div>
                        <h2>회원정보 수정</h2>

                        {!verified ? (
                            <div className={styles.verifyBox}>
                                <input
                                    type="password"
                                    placeholder="현재 비밀번호"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button onClick={handlePasswordCheck}>비밀번호 확인</button>
                            </div>
                        ) : (
                            <div className={styles.editBox}>
                                <input
                                    type="text"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    placeholder="새 닉네임"
                                />

                                <div>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        placeholder="새 이메일"
                                    />
                                    <button onClick={handleSendEmailCode}>인증번호 전송</button>
                                </div>

                                {emailSent && (
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="인증번호 입력"
                                            value={emailCode}
                                            onChange={(e) => setEmailCode(e.target.value)}
                                        />
                                        <button onClick={handleVerifyEmail}>확인</button>
                                    </div>
                                )}

                                <input
                                    type="password"
                                    placeholder="새 비밀번호 (영문+숫자 8자 이상)"
                                    value={form.newPassword}
                                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                                />

                                <input
                                    type="password"
                                    placeholder="비밀번호 확인"
                                    value={form.newPasswordCheck}
                                    onChange={(e) =>
                                        setForm({ ...form, newPasswordCheck: e.target.value })
                                    }
                                />

                                <button onClick={handleUpdate}>수정하기</button>
                            </div>
                        )}
                    </div>
                )}

                {/* ✅ 내가 쓴 게시글 */}
                {activeTab === "posts" && (
                    <div>
                        <h2>내가 쓴 게시글</h2>
                        {myDebates.length === 0 ? (
                            <p>작성한 게시글이 없습니다.</p>
                        ) : (
                            <ul className={styles.debateList}>
                                {myDebates.map((d) => (
                                    <li key={d.id} className={styles.debateItem}>
                                        <div
                                            className={styles.debateHeader}
                                            onClick={() => toggleExpand(d.id)}
                                            style={{ cursor: "pointer" }}
                                        >
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
                                        </div>

                                        {/* ✅ 제목 클릭 시 상세 내용 표시 */}
                                        {expandedId === d.id && (
                                            <div className={styles.debateContent}>
                                                <p>{d.content}</p>
                                            </div>
                                        )}
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
