import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DebateBoard from "./pages/DebateBoard";
import CreateDebatePage from "./pages/CreateDebatePage";
import MyPage from "./pages/MyPage";
import AppleGamePage from "./pages/AppleGamePage";
import LoginIDsearch from "./pages/Login-IDsearch";
import LoginPasswordsearch from "./pages/Login-Passwordsearch";
import ChatRoom from "./pages/ChatRoom";

export default function App() {
    return (
        <Router>
            <Routes>
                {/* ✅ 기본 루트 */}
                <Route path="/" element={<Navigate to="/board" />} />
                <Route path="/chatroom" element={<ChatRoom />} />
                {/* ✅ 주요 페이지 */}
                <Route path="/board" element={<DebateBoard />} />
                <Route path="/mypage" element={<MyPage />} />
                <Route path="/applegame" element={<AppleGamePage />} />

                {/* ✅ 로그인 / 회원가입 */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* ✅ 새 토론 생성 */}
                <Route path="/create" element={<CreateDebatePage />} />

                {/* ✅ fallback */}
                <Route path="*" element={<Navigate to="/board" />} />

                <Route path="/login/idsearch" element={<LoginIDsearch />} />
                <Route path="/login/passwordsearch" element={<LoginPasswordsearch />} />

                
            </Routes>
        </Router>
    );
}
