import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./MyPage.module.css";
import CommentSection from "../components/CommentSection";
import axios from "axios";
import { API_BASE_URL } from "../api/baseURL";   // 경로는 파일 위치에 따라 ../ 또는 ../../

axios.defaults.baseURL = API_BASE_URL;

// ✅ 네트워크 고정

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

    // ✨ 추가: 토론 수정용 상태
    const [editDebateId, setEditDebateId] = useState(null);
    const [editDebateForm, setEditDebateForm] = useState({ title: "", content: "" });

    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const [deleting, setDeleting] = useState(false);   // 🔥 회원탈퇴 로딩 상태
    const navigate = useNavigate();

    const [isDeleteMode, setIsDeleteMode] = useState(false); // 🔥 회원 탈퇴 진행 모드
    const [deleteReason, setDeleteReason] = useState("");    // 🔥 선택한 탈퇴 사유
    const [deleteReasonDetail, setDeleteReasonDetail] = useState(""); // 🔥 기타 사유 텍스트

    const [showReasonBox, setShowReasonBox] = useState(false); // 🔥 사유 목록 펼치기/접기
    // ✅ 상태 우선순위(정렬용): 반박해보세요(0) → 반박중(1) → 마감(2)
    const statusRank = (d) => (d.isClosed ? 2 : d.rebuttalTitle ? 1 : 0);
    const DELETE_REASONS = [
        "서비스 이용 빈도가 낮아서",
        "더 이상 서비스를 이용할 필요가 없어서",
        "계정이 너무 많아서 정리하고 싶어서",
        "서비스에 만족하지 못해서",
        "개선이 필요한 부분이 많아서",
        "다른 경쟁 서비스로 이동하기 위해서",
        "개인정보 유출이 우려되어서",
        "개인정보 수집 및 이용에 동의할 수 없어서",
        "불필요한 개인정보를 남기고 싶지 않아서",
        "기타"
    ];
    // ✅ 회원 탈퇴
// - 이메일 인증 완료(verified === true)
// - 비밀번호 1개만 입력(확인 X)
// - 탈퇴 사유 선택
// - 확인창에서 OK 눌러야 실제 삭제 + delete_account 테이블 로그 저장
    const handleDeleteAccount = async () => {
        if (!currentUser) {
            alert("로그인이 필요합니다.");
            return;
        }

        // 혹시라도 탈퇴 모드가 아니면 그냥 무시
        if (!isDeleteMode) return;

        if (!verified) {
            alert("이메일 인증을 먼저 완료해주세요.");
            return;
        }

        if (!editForm.password) {
            alert("비밀번호를 입력해주세요.");
            return;
        }

        if (!pwRegex.test(editForm.password)) {
            alert("비밀번호는 영어, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.");
            return;
        }

        if (!deleteReason) {
            alert("탈퇴 사유를 선택해주세요.");
            return;
        }

// 🔥 기타 선택 시 세부 사유 필수
        let finalReason = deleteReason;
        if (deleteReason === "기타") {
            if (!deleteReasonDetail.trim()) {
                alert("기타 사유를 입력해주세요.");
                return;
            }
            finalReason = `기타: ${deleteReasonDetail.trim()}`;
        }

        const ok = window.confirm(
            "정말로 탈퇴하시겠습니까?\n탈퇴 후에는 모든 정보가 삭제되며 복구가 불가능합니다."
        );
        if (!ok) return;

        try {
            setDeleting(true);

            // 1) 탈퇴 사유 로그 저장
            await axios.post("/api/delete-account", {
                userId: currentUser.id,
                email: editForm.email || currentUser.email,
                reason: finalReason,   // 🔥 여기!
            });



            // 2) 실제 유저 삭제
            await axios.delete(`/api/users/delete/${currentUser.id}`, {
                data: { password: editForm.password },
            });

            alert("회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.");
            localStorage.removeItem("user");
            navigate("/");
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
    // ✨ 내가 쓴 토론 통계 (개수 표시용)
    const debateStats = useMemo(() => {
        const total = myDebates.length;
        const open = myDebates.filter((d) => !d.isClosed && !d.rebuttalTitle).length;   // 반박해보세요
        const rebut = myDebates.filter((d) => !d.isClosed && d.rebuttalTitle).length;   // 반박중
        const closed = myDebates.filter((d) => d.isClosed).length;                      // 마감
        return { total, open, rebut, closed };
    }, [myDebates]);

    // ✨ 수정/삭제 가능 여부 (반박해보세요만 true)
    const canEditDebate = (debate) => !debate.isClosed && !debate.rebuttalTitle;
    const canDeleteDebate = (debate) => !debate.isClosed && !debate.rebuttalTitle;

    // ✨ 수정 버튼 눌렀을 때
    const handleDebateEditClick = (debate) => {
        if (!canEditDebate(debate)) {
            alert("반박중이거나 마감된 토론은 수정할 수 없습니다.");
            return;
        }
        setEditDebateId(debate.id);
        setEditDebateForm({
            title: debate.title || "",
            content: debate.content || "",
        });
    };

    // ✨ 토론 수정 저장
    const handleDebateUpdate = async (debateId) => {
        if (!editDebateForm.title.trim() || !editDebateForm.content.trim()) {
            return alert("제목과 내용을 모두 입력해주세요.");
        }
        setLoading(true);
        try {
            // ⚠️ 백엔드에 PUT /api/debates/{id} 구현 필요
            await axios.put(`/api/debates/${debateId}`, {
                title: editDebateForm.title,
                content: editDebateForm.content,
            });

            alert("토론이 수정되었습니다.");
            setEditDebateId(null);
            await fetchMyDebates(currentUser?.username);
        } catch (err) {
            console.error("❌ 토론 수정 실패:", err);
            alert(err.response?.data || "토론 수정 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // ✨ 토론 삭제 (반박중/마감은 삭제 불가)
    const handleMyDebateDelete = async (debate) => {
        if (!canDeleteDebate(debate)) {
            alert("반박중이거나 마감된 토론은 삭제할 수 없습니다.");
            return;
        }
        if (!window.confirm("이 토론을 삭제하시겠습니까?")) return;

        try {
            await axios.delete(`/api/debates/${debate.id}`);
            alert("토론이 삭제되었습니다.");
            if (editDebateId === debate.id) setEditDebateId(null);
            await fetchMyDebates(currentUser?.username);
        } catch (err) {
            console.error("❌ 토론 삭제 실패:", err);
            alert(err.response?.data || "토론 삭제 중 오류가 발생했습니다.");
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
                return alert("비밀번호는 영어, 숫자를 포함해 8자 이상이어야 합니다.");
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

                        {/* ✅ 비밀번호 (수정 / 탈퇴 공용) */}
                        <div className={styles.inputGroup}>
                            <label>{isDeleteMode ? "비밀번호 (본인 확인)" : "새 비밀번호"}</label>
                            <input
                                type="password"
                                value={editForm.password}
                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                placeholder={
                                    isDeleteMode
                                        ? "현재 계정 비밀번호를 입력하세요"
                                        : "영문+숫자+특수문자 8자 이상"
                                }
                            />
                        </div>

                        {/* ✅ 일반 정보 수정일 때만 비밀번호 확인 + 수정 버튼 노출 */}
                        {!isDeleteMode && (
                            <>
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
                            </>
                        )}

                        {/* 🔥 탈퇴 모드일 때만 '사유 선택' 박스 표시 */}
                        {isDeleteMode && (
                            <div className={styles.deleteReasonSection}>
                                <button
                                    type="button"
                                    className={styles.deleteReasonToggle}
                                    onClick={() => setShowReasonBox((prev) => !prev)}
                                >
                                    <span>회원 탈퇴 사유 선택</span>
                                    <span className={styles.chevron}>
                {showReasonBox ? "▲" : "▼"}
            </span>
                                </button>

                                {showReasonBox && (
                                    <div className={styles.deleteReasonList}>
                                        {DELETE_REASONS.map((reason) => (
                                            <label key={reason} className={styles.deleteReasonItem}>
                                                <input
                                                    type="radio"
                                                    name="deleteReason"
                                                    value={reason}
                                                    checked={deleteReason === reason}
                                                    onChange={(e) => setDeleteReason(e.target.value)}
                                                />
                                                <span>{reason}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                {/* 🔥 '기타' 선택 시 추가 사유 입력 칸 */}
                                {deleteReason === "기타" && (
                                    <textarea
                                        className={styles.deleteReasonEtcInput}
                                        placeholder="구체적인 탈퇴 사유를 입력해주세요."
                                        value={deleteReasonDetail}
                                        onChange={(e) => setDeleteReasonDetail(e.target.value)}
                                    />
                                )}

                                {deleteReason && !showReasonBox && (
                                    <p className={styles.deleteReasonSelected}>
                                        선택된 사유: <b>{deleteReason}</b>
                                    </p>
                                )}
                            </div>
                        )}

                        {/* 🔥 회원 탈퇴 영역 */}
                        {!isDeleteMode ? (
                            // 1단계: 탈퇴 모드 전환 버튼
                            <div className={styles.deleteSection}>
                                <p className={styles.deleteNotice}>
                                    ⚠️ 회원 탈퇴 시 모든 데이터가 영구 삭제되며, 복구가 불가능합니다.
                                </p>
                                <button
                                    type="button"
                                    className={styles.deleteButton}
                                    onClick={() => {
                                        setIsDeleteMode(true);
                                        setDeleteReason("");
                                        setShowReasonBox(true);
                                        setDeleteReasonDetail("");
                                        setEditForm((prev) => ({ ...prev, password: "" }));
                                        setConfirmPassword("");
                                    }}
                                    disabled={deleting}
                                >
                                    회원 탈퇴 진행하기
                                </button>
                            </div>
                        ) : (
                            // 2단계: 사유 선택 후 실제 탈퇴 버튼 + 취소
                            <div className={styles.deleteSection}>
                                <p className={styles.deleteNotice}>
                                    ⚠️ 탈퇴 후에는 모든 정보가 삭제되며 복구가 불가능합니다.
                                </p>
                                <div className={styles.deleteButtonGroup}>
                                    <button
                                        type="button"
                                        className={styles.deleteCancelButton}
                                        onClick={() => {
                                            setIsDeleteMode(false);
                                            setDeleteReason("");
                                            setDeleteReasonDetail("");
                                            setShowReasonBox(false);
                                            setEditForm((prev) => ({ ...prev, password: "" }));
                                        }}
                                        disabled={deleting}
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.deleteButton}
                                        onClick={handleDeleteAccount}
                                        disabled={deleting}
                                    >
                                        {deleting ? "탈퇴 처리 중..." : "정말 탈퇴하기"}
                                    </button>
                                </div>
                            </div>
                        )}

                    </section>
                )}


                {/* 내가 쓴 토론 */}
                {activeTab === "posts" && (
                    <section className={styles.postSection}>
                        <div className={styles.postHeaderRow}>
                            <h3>🧾 내가 쓴 토론</h3>
                            <div className={styles.postStats}>
                                <span>총 {debateStats.total}개</span>
                                <span>🗣 반박해보세요 {debateStats.open}개</span>
                                <span>⚔ 반박중 {debateStats.rebut}개</span>
                                <span>🕛 마감 {debateStats.closed}개</span>
                            </div>
                        </div>

                        {myDebates.length === 0 ? (
                            <p>작성한 토론이 없습니다.</p>
                        ) : (
                            myDebates.map((debate) => {
                                const statusText = getDebateStatusText(debate);
                                const canEdit = canEditDebate(debate);
                                const canDelete = canDeleteDebate(debate);

                                return (
                                    <div key={debate.id} className={styles.debateCard}>
                                        {/* 카드 헤더 */}
                                        <div
                                            className={styles.debateHeader}
                                            onClick={() => toggleExpand(debate.id)}
                                        >
                                            <div className={styles.debateHeaderLeft}>
                                                <h4 className={styles.debateTitle}>{debate.title}</h4>
                                                <span
                                                    className={`${styles.statusBadge} ${
                                                        debate.isClosed
                                                            ? styles.statusClosed
                                                            : debate.rebuttalTitle
                                                                ? styles.statusRebutted
                                                                : styles.statusOpen
                                                    }`}
                                                >
                                    {statusText}
                                </span>
                                            </div>

                                            <div className={styles.debateHeaderRight}>
                                <span className={styles.debateDate}>
                                    🕓 {formatKST(debate.createdAt)}
                                </span>
                                                <span className={styles.chevron}>
                                    {expandedId === debate.id ? "▲" : "▼"}
                                </span>
                                            </div>
                                        </div>

                                        {/* 펼쳐진 내용 */}
                                        {expandedId === debate.id && (
                                            <div className={styles.debateContent}>
                                                <p className={styles.debateText}>{debate.content}</p>

                                                {debate.rebuttalTitle && (
                                                    <div className={styles.rebuttalBox}>
                                                        <h4>🗣️ {debate.rebuttalTitle}</h4>
                                                        <p>{debate.rebuttalContent}</p>
                                                        <p className={styles.rebuttalMeta}>
                                                            - {debate.rebuttalAuthor}
                                                        </p>
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

                                                {/* ✨ 수정/삭제 버튼 영역 */}
                                                <div className={styles.postActions}>
                                                    <div className={styles.postMeta}>
                                        <span className={styles.postCategory}>
                                            📂 {debate.category || "기타"}
                                        </span>
                                                    </div>
                                                    <div className={styles.postButtonGroup}>
                                                        {/* 수정 버튼 */}
                                                        {canEdit ? (
                                                            <button
                                                                className={styles.postActionButton}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDebateEditClick(debate);
                                                                }}
                                                            >
                                                                ✏️ 수정
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className={`${styles.postActionButton} ${styles.postActionButtonDisabled}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                title="반박중/마감된 토론은 수정할 수 없습니다."
                                                            >
                                                                ✏️ 수정 불가
                                                            </button>
                                                        )}

                                                        {/* 삭제 버튼 */}
                                                        {canDelete ? (
                                                            <button
                                                                className={`${styles.postActionButton} ${styles.postDeleteButton}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMyDebateDelete(debate);
                                                                }}
                                                            >
                                                                🗑 삭제
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className={`${styles.postActionButton} ${styles.postActionButtonDisabled}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                title="반박중/마감된 토론은 삭제할 수 없습니다."
                                                            >
                                                                🗑 삭제 불가
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* ✨ 수정 폼 (반박해보세요 글만) */}
                                                {editDebateId === debate.id && (
                                                    <div className={styles.debateEditArea}>
                                                        <input
                                                            type="text"
                                                            className={styles.debateEditInput}
                                                            placeholder="제목을 입력하세요"
                                                            value={editDebateForm.title}
                                                            onChange={(e) =>
                                                                setEditDebateForm((prev) => ({
                                                                    ...prev,
                                                                    title: e.target.value,
                                                                }))
                                                            }
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <textarea
                                                            className={styles.debateEditTextarea}
                                                            placeholder="내용을 입력하세요"
                                                            value={editDebateForm.content}
                                                            onChange={(e) =>
                                                                setEditDebateForm((prev) => ({
                                                                    ...prev,
                                                                    content: e.target.value,
                                                                }))
                                                            }
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <div className={styles.editButtonsRow}>
                                                            <button
                                                                className={styles.cancelEditButton}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditDebateId(null);
                                                                }}
                                                            >
                                                                취소
                                                            </button>
                                                            <button
                                                                className={styles.saveEditButton}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDebateUpdate(debate.id);
                                                                }}
                                                                disabled={loading}
                                                            >
                                                                {loading ? "저장 중..." : "저장"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* ✅ 댓글 섹션 (원래 있던 부분 유지) */}
                                                <CommentSection
                                                    debateId={debate.id}
                                                    currentUser={currentUser}
                                                    refresh={() => fetchMyDebates(currentUser?.username)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </section>
                )}

            </main>
        </div>
    );
};

export default MyPage;
