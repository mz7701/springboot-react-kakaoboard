package com.example.kakaoboard.repository;

import com.example.kakaoboard.domain.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    // ✅ 특정 토론에 속한 모든 댓글 가져오기
    List<Comment> findByDebateId(Long debateId);

    List<Comment> findByDebateIdAndParentIsNull(Long debateId);

    List<Comment> findByParentId(Long id);
}