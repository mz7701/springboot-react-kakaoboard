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
                {/* ✅ デフォルトルート */}
                <Route path="/" element={<Navigate to="/board" />} />

                {/* ✅ チャットルーム */}
                <Route path="/chatroom" element={<ChatRoom />} />

                {/* ✅ メインページ */}
                <Route path="/board" element={<DebateBoard />} />
                <Route path="/mypage" element={<MyPage />} />
                <Route path="/applegame" element={<AppleGamePage />} />

                {/* ✅ ログイン / 新規登録 */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* ✅ 新規ディベート作成 */}
                <Route path="/create" element={<CreateDebatePage />} />

                {/* ✅ フォールバック */}
                <Route path="*" element={<Navigate to="/board" />} />

                {/* ✅ ID / パスワード検索ページ */}
                <Route path="/login/idsearch" element={<LoginIDsearch />} />
                <Route path="/login/passwordsearch" element={<LoginPasswordsearch />} />
            </Routes>
        </Router>
    );
}
