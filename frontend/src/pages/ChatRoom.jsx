import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ChatRoom.module.css";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { API_BASE_URL } from "../api/baseURL";   // 경로는 파일 위치에 따라 ../ 또는 ../../
import axios from "axios";

axios.defaults.baseURL = API_BASE_URL;

const ChatRoom = () => {
    const [nickname, setNickname] = useState("");
    const [ip, setIp] = useState("");
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [users, setUsers] = useState([]);
    const navigate = useNavigate();
    const clientRef = useRef(null);
    const messagesEndRef = useRef(null);

    // ✅ 로그인된 유저 닉네임 불러오기
    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
            const parsed = JSON.parse(savedUser);
            setNickname(parsed.username);
        }
    }, []);

    // ✅ 입장하기 (STOMP 기반)
    const connectChat = () => {
        if (!nickname.trim()) return alert("닉네임을 입력하세요!");
        if (connected || clientRef.current?.connected) return;
        const socket = new SockJS(`${API_BASE_URL}/ws`);
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            debug: (msg) => console.log(msg),
            onConnect: () => {
                console.log("✅ STOMP 연결 성공");
                setConnected(true);

                // ✅ 채팅 메시지 구독
                client.subscribe("/topic/public", (payload) => {
                    const msg = JSON.parse(payload.body);

                    if (msg.type === "CHAT") {
                        setMessages((prev) => [...prev, `${msg.sender}: ${msg.message}`]);
                    } else if (msg.type === "JOIN") {
                        if (msg.sender === nickname && msg.ip) setIp(msg.ip);
                        setMessages((prev) => [
                            ...prev,
                            `👋 ${msg.sender} (${msg.ip ?? "-"}) 님이 입장하셨습니다.`,
                        ]);
                    } else if (msg.type === "LEAVE") {
                        setMessages((prev) => [
                            ...prev,
                            `🚪 ${msg.sender} 님이 퇴장하셨습니다.`,
                        ]);
                    }
                });

                // ✅ 접속자 목록 구독 (배열/객체 둘 다 처리)
                client.subscribe("/topic/users", (payload) => {
                    try {
                        const data = JSON.parse(payload.body);
                        let list = [];

                        if (Array.isArray(data)) {
                            // 서버가 [ { sender, ip }, ... ] 로 보낸 경우
                            list = data;
                        } else if (data && typeof data === "object") {
                            // 서버가 { sessionId: { sender, ip }, ... } 로 보낸 경우
                            list = Object.values(data);
                        }

                        setUsers(list);
                    } catch (err) {
                        console.error("❌ users payload parse error:", err, payload.body);
                        setUsers([]);
                    }
                });

                // ✅ 입장 알림 보내기 (ip는 서버에서 채움)
                client.publish({
                    destination: "/app/chat.newUser",
                    body: JSON.stringify({ sender: nickname }),
                });
            },
            onStompError: (frame) => {
                console.error("❌ STOMP 에러:", frame.headers["message"]);
            },
        });

        client.activate();
        clientRef.current = client;
    };

    // ✅ 메시지 전송
    const sendMessage = () => {
        if (!input.trim() || !clientRef.current) return;
        clientRef.current.publish({
            destination: "/app/chat.sendMessage",
            body: JSON.stringify({ sender: nickname, message: input }),
        });
        setInput("");
    };

    // ✅ 나가기
    const leaveChat = () => {
        if (clientRef.current) {
            clientRef.current.publish({
                destination: "/app/chat.leaveUser",
                body: JSON.stringify({ sender: nickname }),
            });
            clientRef.current.deactivate();
        }
        setConnected(false);
        setUsers([]);
        setMessages([]);
        navigate("/board");
    };

    // ✅ 새 메시지가 올 때마다 맨 아래로 스크롤
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // ✅ 창 닫기 / 페이지 이동 시 자동 나가기
    useEffect(() => {
        const handleBeforeUnloadOrUnmount = () => {
            if (clientRef.current && connected) {
                try {
                    // 서버에 퇴장 알림
                    clientRef.current.publish({
                        destination: "/app/chat.leaveUser",
                        body: JSON.stringify({ sender: nickname }),
                    });
                } catch (e) {
                    console.error("leave publish error", e);
                }

                try {
                    clientRef.current.deactivate();
                } catch (e) {
                    console.error("deactivate error", e);
                }
            }
        };

        // 브라우저 창 닫기 / 새로고침
        window.addEventListener("beforeunload", handleBeforeUnloadOrUnmount);

        // 컴포넌트 언마운트 시
        return () => {
            handleBeforeUnloadOrUnmount();
            window.removeEventListener("beforeunload", handleBeforeUnloadOrUnmount);
        };
    }, [connected, nickname]);


    return (
        <div className={styles.container}>
            {!connected ? (
                nickname ? (
                    <div className={styles.joinScreen}>
                        <h2>💬 실시간 토론장</h2>
                        <p className={styles.subText}>{nickname}님 입장 중...</p>
                        <button onClick={connectChat} className={styles.joinBtn}>
                            🚪 입장하기
                        </button>
                    </div>
                ) : (
                    <div className={styles.joinScreen}>
                        <h2>💬 실시간 토론장</h2>
                        <p className={styles.subText}>닉네임을 입력하고 입장해주세요.</p>
                        <input
                            placeholder="닉네임"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className={styles.nicknameInput}
                        />
                        <button onClick={connectChat} className={styles.joinBtn}>
                            🚪 입장하기
                        </button>
                    </div>
                )
            ) : (
                <div className={styles.chatLayout}>
                    <div className={styles.chatRoom}>
                        <div className={styles.chatHeader}>
                            <h3>
                                🔥 {nickname} ({ip || "-"})
                            </h3>
                            <button onClick={leaveChat} className={styles.leaveBtn}>
                                🚪 대화 그만하기
                            </button>
                        </div>

                        <div className={styles.messages}>
                            {messages.map((msg, i) => (
                                <p key={i} className={styles.message}>
                                    {msg}
                                </p>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className={styles.inputArea}>
                            <input
                                placeholder="메시지를 입력하세요..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className={styles.chatInput}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            />
                            <button onClick={sendMessage} className={styles.sendBtn}>
                                💬 보내기
                            </button>
                        </div>
                    </div>

                    <div className={styles.userList}>
                        <h4>🧑‍🤝‍🧑 현재 접속자</h4>
                        {users.length === 0 ? (
                            <p className={styles.noUser}>접속자 없음</p>
                        ) : (
                            users.map((u, i) => (
                                <div key={i} className={styles.userCard}>
                                    <span className={styles.userName}>{u.sender}</span>
                                    <span className={styles.userIp}>({u.ip})</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatRoom;
