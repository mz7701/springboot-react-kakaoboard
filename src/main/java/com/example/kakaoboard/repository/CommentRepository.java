package com.example.kakaoboard.repository;

import com.example.kakaoboard.domain.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional; // ★ 追加
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    // ✅ 特定の討論に紐づくすべてのコメントを取得
    List<Comment> findByDebateId(Long debateId);

    // ✅ 特定の討論に紐づく「親コメント（最上位）」のみ取得
    List<Comment> findByDebateIdAndParentIsNull(Long debateId);

    // ✅ 親コメントIDから、その配下の子コメント一覧を取得
    List<Comment> findByParentId(Long id);

    // ✅ 特定の討論に属する「単一コメント」を検索（削除用）
    Optional<Comment> findByIdAndDebateId(Long id, Long debateId);  // ★ 追加
}
