package com.example.kakaoboard.service;

import com.example.kakaoboard.domain.Comment;
import com.example.kakaoboard.domain.Debate;
import com.example.kakaoboard.domain.Reply;
import com.example.kakaoboard.repository.CommentRepository;
import com.example.kakaoboard.repository.DebateRepository;
import com.example.kakaoboard.repository.ReplyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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
    public void updateWinner(Debate debate) {
        if (debate.getAuthorVotes() > debate.getRebuttalVotes()) {
            debate.setWinner("author");
        } else if (debate.getAuthorVotes() < debate.getRebuttalVotes()) {
            debate.setWinner("rebuttal");
        } else {
            debate.setWinner("draw");
        }
        debateRepository.save(debate);
    }
    /** ✅ 자동 마감 기능 1분마다 검사) */
    @Scheduled(fixedRate = 60000) // 60초마다 검사
    public void closeExpiredDebates() {
        List<Debate> debates = debateRepository.findAll();
        LocalDateTime now = LocalDateTime.now();

        for (Debate d : debates) {
            if (d.getRebuttalAt() != null && !d.isClosed()) {
                // ✅ 반박 후 12시간 지나면 자동 마감
                if (d.getRebuttalAt().plusHours(12).isBefore(now)) {
                    d.setClosed(true);
                    d.setClosedAt(now);
                    debateRepository.save(d);
                    System.out.println("✅ 자동 마감된 토론: " + d.getTitle());
                }
            }
        }
    }

    /** ✅ 투표 기능 */
    /** ✅ 제3자 1회 투표 전용 기능 */
    /** ✅ 제3자 여러명 투표 가능 / 단, 아이디당 1회 제한 */
    public ResponseEntity<?> vote(Long id, Map<String, String> body) {
        String type = body.get("type");   // "author" 또는 "rebuttal"
        String voter = body.get("voter"); // 로그인한 username

        Debate debate = debateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("토론을 찾을 수 없습니다."));

        // ✅ 1️⃣ 본인(A,B)은 투표 불가
        if (voter.equals(debate.getAuthor()) || voter.equals(debate.getRebuttalAuthor())) {
            return ResponseEntity.badRequest().body("본인은 투표할 수 없습니다!");
        }

        // ✅ 2️⃣ 제3자(C,D,E...)는 투표 가능하되, 아이디당 1회 제한
        if (debate.getVoters() == null) {
            debate.setVoters(new java.util.ArrayList<>());
        }
        if (debate.getVoters().contains(voter)) {
            return ResponseEntity.badRequest().body("이미 이 토론에 투표하셨습니다!");
        }

        // ✅ 3️⃣ 투표 반영
        switch (type) {
            case "author" -> debate.setAuthorVotes(debate.getAuthorVotes() + 1);
            case "rebuttal" -> debate.setRebuttalVotes(debate.getRebuttalVotes() + 1);
            default -> {
                return ResponseEntity.badRequest().body("잘못된 투표 유형입니다.");
            }
        }

        // ✅ 4️⃣ 투표자 저장 (아이디 기록)
        debate.getVoters().add(voter);
        debateRepository.save(debate);

        return ResponseEntity.ok("✅ 투표 완료!");
    }

}
