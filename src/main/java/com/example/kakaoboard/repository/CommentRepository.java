package com.example.kakaoboard.repository;

import com.example.kakaoboard.domain.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional; // ★ 추가
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    // ✅ 특정 토론에 속한 모든 댓글 가져오기
    List<Comment> findByDebateId(Long debateId);

    List<Comment> findByDebateIdAndParentIsNull(Long debateId);

    List<Comment> findByParentId(Long id);

    // ✅ 특정 토론 안에 속한 '단일 댓글' 찾기 (삭제용)
    Optional<Comment> findByIdAndDebateId(Long id, Long debateId);  // ★ 추가
}
