import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./RegisterPage.module.css"; // CSS 모듈 import

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
        <div className={styles.container}>
            <form onSubmit={handleSubmit} className={styles.form}>
                <h2 className={styles.title}>회원가입</h2>
                <input
                    type="text"
                    name="username"
                    placeholder="아이디"
                    value={form.username}
                    onChange={handleChange}
                    className={styles.input}
                    required
                />
                <input
                    type="email"
                    name="email"
                    placeholder="이메일 (예: test@example.com)"
                    value={form.email}
                    onChange={handleChange}
                    className={styles.input}
                    required
                />
                <input
                    type="password"
                    name="password"
                    placeholder="비밀번호"
                    value={form.password}
                    onChange={handleChange}
                    className={styles.input}
                    required
                />
                <button type="submit" className={styles.button}>
                    회원가입
                </button>
            </form>
        </div>
    );
};

export default RegisterPage;