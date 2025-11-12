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

import java.util.stream.Collectors;
import java.util.*;
import java.time.LocalDateTime;
import jakarta.servlet.http.HttpServletRequest;

@Service
@RequiredArgsConstructor
public class DebateService {

    private final DebateRepository debateRepository;
    private final CommentRepository commentRepository;
    private final ReplyRepository replyRepository;

    // ✅ 공통 IP 추출 유틸 (여기로 옮기기)
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty()) ip = request.getRemoteAddr();
        if (ip.contains(",")) ip = ip.split(",")[0].trim();
        if ("0:0:0:0:0:0:0:1".equals(ip)) ip = "127.0.0.1";
        return ip;
    }
    /**
     * ✅ 모든 토론 조회
     */
    public List<Debate> findAll() {
        return debateRepository.findAll();
    }

    /**
     * ✅ 새 토론 생성
     */
    public Debate createDebate(Debate debate) {
        return debateRepository.save(debate);
    }

    /**
     * ✅ 좋아요
     */
    public Debate like(Long id) {
        return debateRepository.findById(id).map(d -> {
            d.setLikes(d.getLikes() + 1);
            return debateRepository.save(d);
        }).orElse(null);
    }

    /**
     * ✅ 싫어요
     */
    public Debate dislike(Long id) {
        return debateRepository.findById(id).map(d -> {
            d.setDislikes(d.getDislikes() + 1);
            return debateRepository.save(d);
        }).orElse(null);
    }

    /**
     * ✅ 댓글 추가
     */
    public Comment addComment(Long debateId, Comment comment, HttpServletRequest request) {
        Debate debate = debateRepository.findById(debateId)
                .orElseThrow(() -> new RuntimeException("토론을 찾을 수 없습니다."));
        comment.setDebate(debate);
        comment.setCreatedAt(LocalDateTime.now());



        comment.setIpAddress(getClientIp(request));



        return commentRepository.save(comment);
    }

    /** ✅ 대댓글 추가 (이제 Comment 기반으로 처리) */
    /**
     * ✅ 대댓글 추가 (IP까지 저장)
     */
    public Comment addReply(Long debateId, Long parentId, Comment reply, HttpServletRequest request) {
        Debate debate = debateRepository.findById(debateId)
                .orElseThrow(() -> new RuntimeException("토론을 찾을 수 없습니다."));

        Comment parent = commentRepository.findById(parentId)
                .orElseThrow(() -> new RuntimeException("부모 댓글을 찾을 수 없습니다."));

        reply.setDebate(debate);
        reply.setParent(parent);
        reply.setCreatedAt(LocalDateTime.now());


        reply.setIpAddress(getClientIp(request));


        return commentRepository.save(reply);
    }

    /**
     * ✅ 토론 삭제
     */
    public void deleteById(Long id) {
        debateRepository.deleteById(id);
    }

    /**
     * ✅ 승자 계산
     */
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

    /**
     * ✅ 자동 마감 기능 (1분마다 검사)
     */
    @Scheduled(fixedRate = 60000)
    public void closeExpiredDebates() {
        List<Debate> debates = debateRepository.findAll();
        LocalDateTime now = LocalDateTime.now();

        for (Debate d : debates) {
            if (d.getRebuttalAt() != null && !d.isClosed()) {
                if (d.getRebuttalAt().plusHours(12).isBefore(now)) {
                    d.setClosed(true);
                    d.setClosedAt(now);
                    debateRepository.save(d);
                    System.out.println("✅ 자동 마감된 토론: " + d.getTitle());
                }
            }
        }
    }

    /**
     * ✅ 제3자 투표 기능
     */
    public ResponseEntity<?> vote(Long id, Map<String, String> body) {
        String type = body.get("type");
        String voter = body.get("voter");

        Debate debate = debateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("토론을 찾을 수 없습니다."));

        if (voter.equals(debate.getAuthor()) || voter.equals(debate.getRebuttalAuthor())) {
            return ResponseEntity.badRequest().body("본인은 투표할 수 없습니다!");
        }

        if (debate.getVoters() == null) {
            debate.setVoters(new ArrayList<>());
        }
        if (debate.getVoters().contains(voter)) {
            return ResponseEntity.badRequest().body("이미 이 토론에 투표하셨습니다!");
        }

        switch (type) {
            case "author" -> debate.setAuthorVotes(debate.getAuthorVotes() + 1);
            case "rebuttal" -> debate.setRebuttalVotes(debate.getRebuttalVotes() + 1);
            default -> {
                return ResponseEntity.badRequest().body("잘못된 투표 유형입니다.");
            }
        }

        debate.getVoters().add(voter);
        debateRepository.save(debate);

        return ResponseEntity.ok("✅ 투표 완료!");
    }

    // DebateService.java 안에 추가
    public Comment addReplyAsComment(Long debateId, Long parentId, Comment reply) {
        Debate debate = debateRepository.findById(debateId)
                .orElseThrow(() -> new RuntimeException("토론을 찾을 수 없습니다."));
        Comment parent = commentRepository.findById(parentId)
                .orElseThrow(() -> new RuntimeException("부모 댓글을 찾을 수 없습니다."));

        reply.setDebate(debate);
        reply.setParent(parent);
        reply.setCreatedAt(LocalDateTime.now());
        parent.addReply(reply); // ✅ 부모 댓글에 직접 추가
        return commentRepository.save(reply);
    }

    /** ✅ 댓글 트리 (중복 없는 무한 대댓글 완전 지원) */
    public List<Comment> getCommentTree(Long debateId) {
        // 1️⃣ 부모 댓글만 가져옴
        List<Comment> roots = commentRepository.findByDebateIdAndParentIsNull(debateId);

        // 2️⃣ 각각의 부모 댓글에 하위 댓글 재귀적으로 채우기
        for (Comment root : roots) {
            fillRepliesRecursively(root);
        }

        // 3️⃣ 시간 순 정렬
        roots.sort(Comparator.comparing(Comment::getCreatedAt));
        return roots;
    }

    /** ✅ 재귀적으로 모든 하위 댓글 로딩 */
    private void fillRepliesRecursively(Comment comment) {
        List<Comment> replies = commentRepository.findByParentId(comment.getId());
        replies.sort(Comparator.comparing(Comment::getCreatedAt));
        comment.setReplies(replies);

        for (Comment reply : replies) {
            fillRepliesRecursively(reply);
        }
    }

}
