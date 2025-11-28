import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ChatRoom.module.css";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { API_BASE_URL } from "../api/baseURL";   // パスはファイル位置によって ../ または ../../
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

    // ✅ ログイン中ユーザーのニックネームを取得
    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
            const parsed = JSON.parse(savedUser);
            setNickname(parsed.username);
        }
    }, []);

    // ✅ 入室（STOMP ベース）
    const connectChat = () => {
        if (!nickname.trim()) return alert("ニックネームを入力してください！");
        if (connected || clientRef.current?.connected) return;

        const socket = new SockJS(`${API_BASE_URL}/ws`);
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            debug: (msg) => console.log(msg),
            onConnect: () => {
                console.log("✅ STOMP 接続成功");
                setConnected(true);

                // ✅ チャットメッセージ購読
                client.subscribe("/topic/public", (payload) => {
                    const msg = JSON.parse(payload.body);

                    if (msg.type === "CHAT") {
                        setMessages((prev) => [...prev, `${msg.sender}: ${msg.message}`]);
                    } else if (msg.type === "JOIN") {
                        if (msg.sender === nickname && msg.ip) setIp(msg.ip);
                        setMessages((prev) => [
                            ...prev,
                            `👋 ${msg.sender} (${msg.ip ?? "-"}) さんが入室しました。`,
                        ]);
                    } else if (msg.type === "LEAVE") {
                        setMessages((prev) => [
                            ...prev,
                            `🚪 ${msg.sender} さんが退室しました。`,
                        ]);
                    }
                });

                // ✅ 接続ユーザー一覧購読（配列 / オブジェクト両方に対応）
                client.subscribe("/topic/users", (payload) => {
                    try {
                        const data = JSON.parse(payload.body);
                        let list = [];

                        if (Array.isArray(data)) {
                            // サーバーが [ { sender, ip }, ... ] で送る場合
                            list = data;
                        } else if (data && typeof data === "object") {
                            // サーバーが { sessionId: { sender, ip }, ... } で送る場合
                            list = Object.values(data);
                        }

                        setUsers(list);
                    } catch (err) {
                        console.error("❌ users payload parse error:", err, payload.body);
                        setUsers([]);
                    }
                });

                // ✅ 入室通知送信（ip はサーバー側で付与）
                client.publish({
                    destination: "/app/chat.newUser",
                    body: JSON.stringify({ sender: nickname }),
                });
            },
            onStompError: (frame) => {
                console.error("❌ STOMP エラー:", frame.headers["message"]);
            },
        });

        client.activate();
        clientRef.current = client;
    };

    // ✅ メッセージ送信
    const sendMessage = () => {
        if (!input.trim() || !clientRef.current) return;
        clientRef.current.publish({
            destination: "/app/chat.sendMessage",
            body: JSON.stringify({ sender: nickname, message: input }),
        });
        setInput("");
    };

    // ✅ 退室
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

    // ✅ 新しいメッセージが来たら一番下までスクロール
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // ✅ ウィンドウを閉じる / ページ移動時に自動退室
    useEffect(() => {
        const handleBeforeUnloadOrUnmount = () => {
            if (clientRef.current && connected) {
                try {
                    // サーバーに退室通知
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

        // ブラウザのウィンドウを閉じる / リロード
        window.addEventListener("beforeunload", handleBeforeUnloadOrUnmount);

        // コンポーネントアンマウント時
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
                        <h2>💬 リアルタイム討論室</h2>
                        <p className={styles.subText}>{nickname} さん、入室準備中...</p>
                        <button onClick={connectChat} className={styles.joinBtn}>
                            🚪 入室する
                        </button>
                    </div>
                ) : (
                    <div className={styles.joinScreen}>
                        <h2>💬 リアルタイム討論室</h2>
                        <p className={styles.subText}>
                            ニックネームを入力して入室してください。
                        </p>
                        <input
                            placeholder="ニックネーム"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className={styles.nicknameInput}
                        />
                        <button onClick={connectChat} className={styles.joinBtn}>
                            🚪 入室する
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
                                🚪 退室する
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
                                placeholder="メッセージを入力してください..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className={styles.chatInput}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            />
                            <button onClick={sendMessage} className={styles.sendBtn}>
                                💬 送信
                            </button>
                        </div>
                    </div>

                    <div className={styles.userList}>
                        <h4>🧑‍🤝‍🧑 現在の参加者</h4>
                        {users.length === 0 ? (
                            <p className={styles.noUser}>参加者はいません</p>
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
