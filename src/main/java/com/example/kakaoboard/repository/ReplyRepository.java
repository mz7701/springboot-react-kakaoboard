package com.example.kakaoboard.repository;

import com.example.kakaoboard.domain.Reply;
import org.springframework.data.jpa.repository.JpaRepository;


public interface ReplyRepository extends JpaRepository<Reply, Long> {}