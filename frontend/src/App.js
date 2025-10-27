import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DebateBoard from './pages/DebateBoard';

function App() {
  const isLoggedIn = localStorage.getItem('user');

  return (
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
              path="/board"
              element={isLoggedIn ? <DebateBoard /> : <Navigate to="/login" />}
          />
        </Routes>
      </Router>
  );
}

export default App;