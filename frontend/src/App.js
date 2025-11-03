import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DebateBoard from "./pages/DebateBoard";
import CreateDebatePage from "./pages/CreateDebatePage";
import MyPage from "./pages/MyPage";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<DebateBoard />} />
                <Route path="/mypage" element={<MyPage />} />
                {/* ✅ 첫 진입 시 자동으로 토론의 전당으로 */}
                <Route path="/" element={<Navigate to="/board" />} />

                {/* 로그인 관련 */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* ✅ 비회원도 글 보기 가능 */}
                <Route path="/board" element={<DebateBoard />} />

                {/* ✅ 새 토론 만들기 (비회원 접근 시 alert) */}
                <Route path="/create" element={<CreateDebatePage />} />

                {/* ✅ 모든 자식은 반드시 <Route>로 감싸야 함 */}
                <Route path="/" element={<DebateBoard />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/create" element={<CreateDebatePage />} />
                <Route path="/mypage" element={<MyPage />} />
            </Routes>
        </Router>
    );
}

export default App;