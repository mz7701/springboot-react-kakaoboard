import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./MyPage.module.css";
import CommentSection from "../components/CommentSection";

// ✅ 네트워크 고정
axios.defaults.baseURL = "http://192.168.0.21:8080";
axios.defaults.headers.post["Content-Type"] = "application/json";

// ✅ 날짜 포맷 유틸
const formatKST = (iso) => {
    if (!iso) return "-";
    try {
        return new Date(iso).toLocaleString("ko-KR", { hour12: false });
    } catch {
        return iso;
    }
};

// ✅ 토론 상태 텍스트/색상
const getDebateStatusText = (d) =>
    d.isClosed ? "마감된 토론" : d.rebuttalTitle ? "반박중" : "반박해보세요";
const getDebateStatusColor = (d) =>
    d.isClosed ? "#888" : d.rebuttalTitle ? "#e67e22" : "#27ae60";

// ✅ 상태 우선순위(정렬용): 반박해보세요(0) → 반박중(1) → 마감(2)
const statusRank = (d) => (d.isClosed ? 2 : d.rebuttalTitle ? 1 : 0);

const MyPage = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState("info");

    // 정보 수정 폼
    const [editForm, setEditForm] = useState({ nickname: "", email: "", password: "" });
    const [confirmPassword, setConfirmPassword] = useState("");

    // 인증 관련
    const [verified, setVerified] = useState(false);
    const [verificationCode, setVerificationCode] = useState("");
    const [emailSent, setEmailSent] = useState(false);

    // 내 글/UI
    const [myDebates, setMyDebates] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const [deleting, setDeleting] = useState(false);   // 🔥 회원탈퇴 로딩 상태
    const navigate = useNavigate();

    // ✅ 회원 탈퇴
    // - 이메일 인증 완료(verified === true)
    // - 비밀번호 & 비밀번호 확인 일치 + 규칙 통과
    // - 확인창에서 OK 눌러야 실제 삭제
    const handleDeleteAccount = async () => {
        if (!currentUser) {
            return alert("로그인이 필요합니다.");
        }
        if (!verified) {
            return alert("이메일 인증을 먼저 완료해주세요.");
        }
        if (!editForm.password || !confirmPassword) {
            return alert("비밀번호와 비밀번호 확인을 모두 입력해주세요.");
        }
        if (editForm.password !== confirmPassword) {
            return alert("비밀번호가 일치하지 않습니다.");
        }
        if (!pwRegex.test(editForm.password)) {
            return alert("비밀번호는 영어, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.");
        }

        const ok = window.confirm(
            "정말로 탈퇴하시겠습니까?\n탈퇴 후에는 모든 정보가 삭제되며 복구가 불가능합니다."
        );
        if (!ok) return;

        try {
            setDeleting(true);
            // 🔥 백엔드에서 /api/users/delete/{id} 또는 /api/users/{id} DELETE 만들어줘
            await axios.delete(`/api/users/delete/${currentUser.id}`, {
                data: { password: editForm.password }, // 서버에서 비번 검증에 사용
            });

            alert("회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.");
            localStorage.removeItem("user");
            navigate("/"); // 메인 화면으로 이동
        } catch (err) {
            console.error("❌ 회원 탈퇴 실패:", err);
            alert(err.response?.data || "회원 탈퇴 중 오류가 발생했습니다.");
        } finally {
            setDeleting(false);
        }
    };

    // 🔥 탈퇴 후 리다이렉트
    // ✅ 로그인 유저 로드
    useEffect(() => {
        const raw = localStorage.getItem("user");
        if (!raw) return;
        const user = JSON.parse(raw);
        setCurrentUser(user);
        setEditForm({ nickname: user.username, email: user.email || "", password: "" });
        fetchMyDebates(user.username);
    }, []);

    // ✅ 내가 쓴 토론 불러오기 (상태 우선 + 최신순)
    const fetchMyDebates = async (username) => {
        if (!username) return;
        try {
            const res = await axios.get("/api/debates");
            const mine = (Array.isArray(res.data) ? res.data : []).filter((d) => d.author === username);

            mine.sort((a, b) => {
                const s = statusRank(a) - statusRank(b);
                if (s !== 0) return s;
                // createdAt 없을 경우 id 기준으로 fallback
                const ad = a.createdAt ? new Date(a.createdAt).getTime() : a.id ?? 0;
                const bd = b.createdAt ? new Date(b.createdAt).getTime() : b.id ?? 0;
                return bd - ad;
            });

            setMyDebates(mine);
        } catch (err) {
            console.error("❌ 내 토론 불러오기 실패:", err);
        }
    };

    // ✅ 이메일 인증번호 전송 (정보수정용: 기존 가입여부 상관X)
    const handleSendCode = async () => {
        if (!editForm.email) return alert("이메일을 입력해주세요.");
        setSending(true);
        try {
            const res = await axios.post("/api/auth/send-code-edit", null, {
                params: { email: editForm.email },
            });
            if (res.status === 200) {
                setEmailSent(true);
                alert("인증번호가 전송되었습니다!");
            }
        } catch (err) {
            console.error("❌ 인증번호 전송 실패:", err);
            // 가입 이메일이라도 수정용은 허용해야 하므로, 서버가 400을 주지 않도록 백엔드 이미 분리해둠.
            alert(err.response?.data || "이메일 전송 중 오류가 발생했습니다.");
        } finally {
            setSending(false);
        }
    };

    // ✅ 인증번호 검증 (정보수정용 전용 엔드포인트 사용)
    const handleVerifyCode = async () => {
        if (!verificationCode) return alert("인증번호를 입력해주세요.");
        setVerifying(true);
        try {
            const res = await axios.post("/api/auth/verify-code-edit", null, {
                params: { email: editForm.email, code: verificationCode },
            });
            const ok = typeof res.data === "string" ? res.data.includes("성공") : !!res.data;
            if (ok) {
                setVerified(true);
                alert("✅ 이메일 인증 완료!");
            } else {
                alert("❌ 인증번호가 올바르지 않습니다.");
            }
        } catch (err) {
            console.error("인증 실패:", err);
            alert(err.response?.data || "인증 중 오류가 발생했습니다.");
        } finally {
            setVerifying(false);
        }
    };

    // ✅ 비번 규칙: 영문+숫자 포함 8자 이상 (특수문자 조건 제거)
    const pwRegex = useMemo(
        () => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/,
        []
    );

    // ✅ 회원정보 수정
    // 백엔드: UserController
    //   - (A) /api/users/update/{id}  ← id path 사용 버전
    //   - (B) /api/users/update       ← body로 id/currentEmail/newEmail 등 보내는 버전
    // 아래는 (A) 기준으로 구현했으니, 네 현재 백엔드와 맞추어 사용!
    const handleUpdate = async () => {
        if (!editForm.nickname.trim()) return alert("닉네임을 입력해주세요.");
        if (!verified) return alert("이메일 인증을 완료해주세요.");

        // 비밀번호 입력 시 확인 & 규칙 체크
        if (editForm.password || confirmPassword) {
            if (editForm.password !== confirmPassword) {
                return alert("비밀번호가 일치하지 않습니다.");
            }
            if (!pwRegex.test(editForm.password)) {
                return alert("비밀번호는 영어, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.");
            }
        }

        if (!currentUser) return alert("로그인이 필요합니다.");

        setLoading(true);
        try {
            // ✅ (A) PathVariable 버전: /api/users/update/{id}
            //    백엔드에서 id로 유저 찾아 username/email/password 업데이트
            const res = await axios.put(`/api/users/update/${currentUser.id}`, {
                username: editForm.nickname,
                email: editForm.email,           // 새 이메일
                password: editForm.password || null,
            });

            alert("✅ 회원정보가 수정되었습니다.");
            localStorage.setItem("user", JSON.stringify(res.data));
            setCurrentUser(res.data);
            setVerified(false);
            setEmailSent(false);
            setVerificationCode("");
            setConfirmPassword("");
        } catch (err) {
            console.error("❌ 회원정보 수정 실패:", err);
            alert(err.response?.data || "수정 중 오류가 발생했습니다.");
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
                        <p>
                            <b>닉네임:</b> {currentUser.username}
                        </p>
                        <p>
                            <b>이메일:</b> {currentUser.email}
                        </p>
                        <p>
                            <b>EXP:</b> {currentUser.exp || 0}
                        </p>
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
                                <button
                                    onClick={handleSendCode}
                                    className={styles.smallButton}
                                    disabled={sending}
                                    title="수정용 인증 메일을 보냅니다"
                                >
                                    {sending ? "전송 중..." : "인증번호 전송"}
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
                                <button
                                    onClick={handleVerifyCode}
                                    className={styles.smallButton}
                                    disabled={verifying}
                                >
                                    {verifying ? "확인 중..." : "인증 확인"}
                                </button>
                            </div>
                        )}

                        <div className={styles.inputGroup}>
                            <label>새 비밀번호</label>
                            <input
                                type="password"
                                value={editForm.password}
                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                placeholder="영문+숫자+특수문자 8자 이상"
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

                        <button
                            onClick={handleUpdate}
                            disabled={loading}
                            className={styles.updateButton}
                        >
                            {loading ? "수정 중..." : "수정하기"}
                        </button>

                        {/* 🔥 회원 탈퇴 영역 */}
                        <div className={styles.deleteSection}>
                            <p className={styles.deleteNotice}>
                                ⚠️ 회원 탈퇴 시 모든 데이터가 영구 삭제되며, 복구가 불가능합니다.
                            </p>
                            <button
                                type="button"
                                className={styles.deleteButton}
                                onClick={handleDeleteAccount}
                                disabled={deleting}
                            >
                                {deleting ? "탈퇴 처리 중..." : "회원 탈퇴하기"}
                            </button>
                        </div>
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
                                    <div className={styles.debateHeader} onClick={() => toggleExpand(debate.id)}>
                                        {/* 제목 + 상태 */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <h4 style={{ margin: 0 }}>{debate.title}</h4>
                                            <span
                                                style={{
                                                    color: getDebateStatusColor(debate),
                                                    fontSize: "0.9rem",
                                                    fontWeight: 700,
                                                }}
                                            >
                        [{getDebateStatusText(debate)}]
                      </span>
                                        </div>

                                        {/* 작성일 */}
                                        <div style={{ fontSize: "0.85rem", color: "#999" }}>
                                            🕓 {formatKST(debate.createdAt)}
                                        </div>

                                        {/* 화살표 */}
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
                                                            {debate.winner === "author" ? debate.author : debate.rebuttalAuthor}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* ✅ 댓글 섹션 */}
                                            <CommentSection
                                                debateId={debate.id}
                                                currentUser={currentUser}
                                                refresh={() => fetchMyDebates(currentUser?.username)}
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
