import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const RegisterPage = () => {
    const [form, setForm] = useState({ username: "", email: "", password: "" });
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post("http://localhost:8080/api/auth/register", form);
            alert("✅ 회원가입이 완료되었습니다! 로그인 해주세요.");
            navigate("/login");
        } catch (err) {
            alert("회원가입 실패: " + err.response?.data || "서버 오류");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-lg w-80">
                <h2 className="text-2xl font-bold mb-4 text-center">회원가입</h2>
                <input
                    type="text"
                    name="username"
                    placeholder="아이디"
                    value={form.username}
                    onChange={handleChange}
                    className="border w-full p-2 mb-3 rounded"
                    required
                />
                <input
                    type="email"
                    name="email"
                    placeholder="이메일 (예: test@example.com)"
                    value={form.email}
                    onChange={handleChange}
                    className="border w-full p-2 mb-3 rounded"
                    required
                />
                <input
                    type="password"
                    name="password"
                    placeholder="비밀번호"
                    value={form.password}
                    onChange={handleChange}
                    className="border w-full p-2 mb-4 rounded"
                    required
                />
                <button
                    type="submit"
                    className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700"
                >
                    회원가입
                </button>
            </form>
        </div>
    );
};

export default RegisterPage;
