package com.example.kakaoboard.repository;

import com.example.kakaoboard.domain.Debate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DebateRepository extends JpaRepository<Debate, Long> {}
