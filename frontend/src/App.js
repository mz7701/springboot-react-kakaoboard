import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// pages
import BoardPage from "./pages/BoardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
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
                <Route path="/" element={<Navigate to="/board" />} />
                <Route path="/board" element={<BoardPage />} />
                <Route path="/chatroom" element={<ChatRoom />} />
                <Route path="/mypage" element={<MyPage />} />
                <Route path="/applegame" element={<AppleGamePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login/idsearch" element={<LoginIDsearch />} />
                <Route path="/login/passwordsearch" element={<LoginPasswordsearch />} />
                <Route path="/create" element={<CreateDebatePage />} />
                <Route path="*" element={<Navigate to="/board" />} />
            </Routes>
        </Router>
    );
}
