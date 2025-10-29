package com.example.kakaoboard.service;

import com.example.kakaoboard.domain.Comment;
import com.example.kakaoboard.domain.Debate;
import com.example.kakaoboard.domain.Reply;
import com.example.kakaoboard.repository.CommentRepository;
import com.example.kakaoboard.repository.DebateRepository;
import com.example.kakaoboard.repository.ReplyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DebateService {

    private final DebateRepository debateRepository;
    private final CommentRepository commentRepository;
    private final ReplyRepository replyRepository;

    /** ✅ 모든 토론 조회 */
    public List<Debate> findAll() {
        return debateRepository.findAll();
    }

    /** ✅ 새 토론 생성 */
    public Debate createDebate(Debate debate) {
        return debateRepository.save(debate);
    }

    /** ✅ 좋아요 */
    public Debate like(Long id) {
        return debateRepository.findById(id).map(d -> {
            d.setLikes(d.getLikes() + 1);
            return debateRepository.save(d);
        }).orElse(null);
    }

    /** ✅ 싫어요 */
    public Debate dislike(Long id) {
        return debateRepository.findById(id).map(d -> {
            d.setDislikes(d.getDislikes() + 1);
            return debateRepository.save(d);
        }).orElse(null);
    }

    /** ✅ 댓글 추가 */
    public Comment addComment(Long debateId, Comment comment) {
        Debate debate = debateRepository.findById(debateId)
                .orElseThrow(() -> new RuntimeException("Debate not found"));
        comment.setDebate(debate);
        return commentRepository.save(comment);
    }

    /** ✅ 대댓글 추가 (별도 Reply 엔티티로 저장) */
    public Reply addReply(Long debateId, Long parentId, Reply reply) {
        Debate debate = debateRepository.findById(debateId)
                .orElseThrow(() -> new RuntimeException("Debate not found"));
        Comment parent = commentRepository.findById(parentId)
                .orElseThrow(() -> new RuntimeException("Parent comment not found"));

        reply.setDebate(debate);
        reply.setParent(parent);

        return replyRepository.save(reply);
    }

    /** ✅ 토론 삭제 */
    public void deleteById(Long id) {
        debateRepository.deleteById(id);
    }
}
