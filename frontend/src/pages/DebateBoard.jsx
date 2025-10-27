import React, { useEffect, useState } from "react";
import axios from "axios";
import { ThumbsUp, ThumbsDown, MessageSquare, Trash2 } from "lucide-react";

const DebateBoard = () => {
    const [debates, setDebates] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [commentInputs, setCommentInputs] = useState({}); // ✅ 각 토론별 입력 저장
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        if (savedUser) setCurrentUser(JSON.parse(savedUser));

        fetchDebates();

        const interval = setInterval(fetchDebates, 3000);
        return () => clearInterval(interval);
    }, []);

    const fetchDebates = async () => {
        try {
            const res = await axios.get("http://localhost:8080/api/debates");
            setDebates(Array.isArray(res.data) ? res.data.reverse() : []);
        } catch (err) {
            console.error("토론 불러오기 실패:", err);
        }
    };

    const handlePostDebate = async () => {
        const title = prompt("토론 제목을 입력하세요:");
        const content = prompt("내용을 입력하세요:");
        if (!title || !content) return alert("제목과 내용을 모두 입력해주세요!");

        setLoading(true);
        try {
            await axios.post("http://localhost:8080/api/debates", {
                title,
                content,
                author: currentUser?.username || "익명",
                expBet: 50,
            });
            alert("✅ 새 토론이 등록되었습니다!");
            await fetchDebates();
        } catch (err) {
            console.error("등록 오류:", err);
            alert("토론 등록 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("정말 삭제하시겠습니까?")) return;
        try {
            await axios.delete(`http://localhost:8080/api/debates/${id}`);
            alert("🗑️ 삭제되었습니다.");
            fetchDebates();
        } catch (err) {
            console.error("삭제 실패:", err);
            alert("삭제 중 오류가 발생했습니다.");
        }
    };

    const handleLike = async (id) => {
        await axios.post(`http://localhost:8080/api/debates/${id}/like`);
        fetchDebates();
    };

    const handleDislike = async (id) => {
        await axios.post(`http://localhost:8080/api/debates/${id}/dislike`);
        fetchDebates();
    };

    const handleCommentChange = (debateId, text) => {
        setCommentInputs({ ...commentInputs, [debateId]: text });
    };

    const handleCommentSubmit = async (debateId) => {
        const text = commentInputs[debateId];
        if (!text || !text.trim()) return alert("댓글을 입력하세요!");

        try {
            await axios.post(`http://localhost:8080/api/debates/${debateId}/comments`, {
                author: currentUser?.username || "익명",
                text,
            });
            setCommentInputs({ ...commentInputs, [debateId]: "" });
            fetchDebates();
        } catch (err) {
            console.error("댓글 등록 실패:", err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            {/* Header */}
            <div className="bg-white p-4 shadow-md rounded-lg mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">🔥 토론의 전당</h1>
                {currentUser && (
                    <div className="text-right">
                        <p className="font-bold">{currentUser.username}</p>
                        <p className="text-sm text-blue-600">EXP: {currentUser.exp}</p>
                    </div>
                )}
            </div>

            {/* 새 토론 등록 */}
            {currentUser && (
                <button
                    onClick={handlePostDebate}
                    disabled={loading}
                    className={`px-4 py-2 rounded text-white mb-5 font-semibold transition ${
                        loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                    {loading ? "등록 중..." : "✏️ 새 토론 등록"}
                </button>
            )}

            {/* 게시글 목록 */}
            {debates.length === 0 ? (
                <p className="text-center text-gray-500 mt-10 text-lg font-medium">
                    아직 등록된 토론이 없습니다.
                </p>
            ) : (
                <div className="space-y-4">
                    {debates.map((debate) => (
                        <div
                            key={debate.id}
                            className="bg-white p-5 rounded-lg shadow-md hover:shadow-xl transition"
                        >
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-gray-800">{debate.title}</h2>

                                {/* 🗑️ 자기 글일 때만 삭제 버튼 */}
                                {currentUser?.username === debate.author && (
                                    <button
                                        onClick={() => handleDelete(debate.id)}
                                        className="text-red-600 hover:text-red-800"
                                        title="삭제하기"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            <p className="text-gray-700 mb-3">{debate.content}</p>
                            <p className="text-sm text-gray-500 mb-4">
                                👤 {debate.author} | 🕒{" "}
                                {new Date(debate.createdAt).toLocaleString()}
                            </p>

                            <div className="flex gap-4 mb-4">
                                <button
                                    onClick={() => handleLike(debate.id)}
                                    className="flex items-center gap-1 text-green-600 hover:text-green-800"
                                >
                                    <ThumbsUp className="w-4 h-4" /> {debate.likes}
                                </button>
                                <button
                                    onClick={() => handleDislike(debate.id)}
                                    className="flex items-center gap-1 text-red-600 hover:text-red-800"
                                >
                                    <ThumbsDown className="w-4 h-4" /> {debate.dislikes}
                                </button>
                            </div>

                            {/* 댓글 섹션 */}
                            <div className="border-t pt-3">
                                <h3 className="font-bold mb-2 flex items-center gap-1">
                                    <MessageSquare className="w-4 h-4" /> 댓글 (
                                    {debate.comments?.length || 0})
                                </h3>

                                <div className="space-y-2 mb-3">
                                    {debate.comments?.map((c) => (
                                        <div
                                            key={c.id}
                                            className="bg-gray-50 p-2 rounded text-sm border border-gray-200"
                                        >
                                            <span className="font-bold">{c.author}: </span>
                                            {c.text}
                                        </div>
                                    ))}
                                </div>

                                {currentUser && (
                                    <div className="flex gap-2">
                                        <input
                                            value={commentInputs[debate.id] || ""}
                                            onChange={(e) =>
                                                handleCommentChange(debate.id, e.target.value)
                                            }
                                            placeholder="댓글을 입력하세요..."
                                            className="flex-1 border rounded px-3 py-2 text-sm"
                                        />
                                        <button
                                            onClick={() => handleCommentSubmit(debate.id)}
                                            className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                                        >
                                            등록
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DebateBoard;
