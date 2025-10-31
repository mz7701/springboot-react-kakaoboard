import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DebateBoard from "./pages/DebateBoard";
import CreateDebatePage from "./pages/CreateDebatePage";

function App() {
    return (
        <Router>
            <Routes>
                {/* ✅ 첫 진입 시 자동으로 토론의 전당으로 */}
                <Route path="/" element={<Navigate to="/board" />} />

                {/* 로그인 관련 */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* ✅ 비회원도 글 보기 가능 */}
                <Route path="/board" element={<DebateBoard />} />

                {/* ✅ 새 토론 만들기 (비회원 접근 시 alert) */}
                <Route path="/create" element={<CreateDebatePage />} />
            </Routes>
        </Router>
    );
}

export default App;