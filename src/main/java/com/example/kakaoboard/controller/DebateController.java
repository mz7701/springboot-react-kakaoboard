package com.example.kakaoboard.controller;

import com.example.kakaoboard.domain.Comment;
import com.example.kakaoboard.domain.Debate;
import com.example.kakaoboard.domain.Reply;
import com.example.kakaoboard.repository.DebateRepository;
import com.example.kakaoboard.service.DebateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/debates")
@RequiredArgsConstructor
@CrossOrigin(origins = {
        "http://localhost:3000",
        "http://192.168.0.21:3000"
})
public class DebateController {

    private final DebateService debateService;
    private final DebateRepository debateRepository;

    /** ✅ 전체 토론 조회 + 자동 마감 */
    @GetMapping
    public ResponseEntity<List<Debate>> getAllDebates() {
        List<Debate> debates = debateRepository.findAll();
        LocalDateTime now = LocalDateTime.now();

        for (Debate d : debates) {
            if (d.getRebuttalAt() != null &&
                    Duration.between(d.getRebuttalAt(), now).toHours() >= 12 &&
                    !d.isClosed()) {

                d.setClosed(true);
                d.setClosedAt(now);
                debateService.updateWinner(d); // ✅ 승자 계산
                debateRepository.save(d);
            }
        }

        return ResponseEntity.ok(debateRepository.findAll());
    }

    /** ✅ 새 토론 생성 */
    @PostMapping
    public ResponseEntity<?> createDebate(@RequestBody Debate debate) {
        try {
            if (debate.getTitle() == null || debate.getContent() == null)
                return ResponseEntity.badRequest().body("제목과 내용을 입력하세요.");
            if (debate.getAuthor() == null || debate.getAuthor().isEmpty())
                debate.setAuthor("익명");

            debate.setCreatedAt(LocalDateTime.now());
            debate.setClosed(false); // ✅ 새 토론은 항상 오픈 상태
            Debate saved = debateService.createDebate(debate);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    /** ✅ 수동 마감 */
    @PatchMapping("/{id}/close")
    public ResponseEntity<?> closeDebate(@PathVariable Long id) {
        Debate debate = debateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("해당 토론을 찾을 수 없습니다."));

        if (debate.isClosed()) {
            return ResponseEntity.badRequest().body("이미 마감된 토론입니다.");
        }

        debate.setClosed(true);
        debate.setClosedAt(LocalDateTime.now());
        debateRepository.save(debate);

        return ResponseEntity.ok("✅ 토론이 수동으로 마감되었습니다.");
    }

    /** ✅ 좋아요 / 싫어요 */
    @PostMapping("/{id}/like")
    public ResponseEntity<?> like(@PathVariable Long id) {
        return ResponseEntity.ok(debateService.like(id));
    }

    @PostMapping("/{id}/dislike")
    public ResponseEntity<?> dislike(@PathVariable Long id) {
        return ResponseEntity.ok(debateService.dislike(id));
    }

    /** ✅ 댓글 추가 */
    @PostMapping("/{debateId}/comments")
    public ResponseEntity<?> addComment(@PathVariable Long debateId, @RequestBody Comment comment) {
        Comment saved = debateService.addComment(debateId, comment);
        return ResponseEntity.ok(saved);
    }

    /** ✅ 대댓글 추가 (Reply 엔티티로 처리) */
    @PostMapping("/{debateId}/comments/{parentId}/reply")
    public ResponseEntity<?> addReply(
            @PathVariable Long debateId,
            @PathVariable Long parentId,
            @RequestBody Reply reply) {

        Reply saved = debateService.addReply(debateId, parentId, reply);
        return ResponseEntity.ok(saved);
    }

    /** ✅ 반박 등록 */
    @PostMapping("/{id}/rebuttal")
    public ResponseEntity<?> addRebuttal(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<Debate> opt = debateRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        Debate debate = opt.get();
        if (debate.getRebuttalTitle() != null)
            return ResponseEntity.badRequest().body("이미 반박이 등록된 토론입니다.");

        debate.setRebuttalTitle(body.get("title"));
        debate.setRebuttalContent(body.get("content"));
        debate.setRebuttalAuthor(body.get("author"));
        debate.setRebuttalAt(LocalDateTime.now());
        debate.setClosed(false); // ✅ 반박 등록 시 무조건 마감 해제 (투표 가능하도록)
        debate.setClosedAt(null);

        debateRepository.save(debate);
        return ResponseEntity.ok(debate);
    }

    /** ✅ 투표 기능 */
    @PostMapping("/{id}/vote")
    public ResponseEntity<?> vote(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            String type = (String) body.get("type");
            String voter = (String) body.get("voter");

            Optional<Debate> opt = debateRepository.findById(id);
            if (opt.isEmpty()) return ResponseEntity.notFound().build();

            Debate debate = opt.get();

            if (debate.getRebuttalTitle() == null)
                return ResponseEntity.badRequest().body("아직 반박이 등록되지 않았습니다.");

            // ✅ 마감 여부는 '12시간이 실제로 지난 경우에만' 차단
            if (debate.isClosed()) {
                LocalDateTime now = LocalDateTime.now();
                if (debate.getRebuttalAt() != null &&
                        Duration.between(debate.getRebuttalAt(), now).toHours() < 12) {
                    // 아직 12시간 안 지났으면 투표 가능
                    debate.setClosed(false);
                } else {
                    return ResponseEntity.badRequest().body("이미 마감된 토론입니다.");
                }
            }

            if (debate.getAuthor().equals(voter) ||
                    (debate.getRebuttalAuthor() != null && debate.getRebuttalAuthor().equals(voter)))
                return ResponseEntity.badRequest().body("작성자 또는 반박자는 투표할 수 없습니다.");

            if (debate.getVoters() == null)
                debate.setVoters(new ArrayList<>());
            if (debate.getVoters().contains(voter))
                return ResponseEntity.badRequest().body("이미 투표하셨습니다.");

            if ("author".equals(type))
                debate.setAuthorVotes(debate.getAuthorVotes() + 1);
            else if ("rebuttal".equals(type))
                debate.setRebuttalVotes(debate.getRebuttalVotes() + 1);
            else
                return ResponseEntity.badRequest().body("잘못된 투표 타입입니다.");

            debate.getVoters().add(voter);
            debateRepository.save(debate);

            return ResponseEntity.ok(Map.of(
                    "message", "✅ 투표 성공",
                    "authorVotes", debate.getAuthorVotes(),
                    "rebuttalVotes", debate.getRebuttalVotes()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("서버 오류 발생: " + e.getMessage());
        }
    }

    /** ✅ 토론 삭제 */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDebate(@PathVariable Long id) {
        debateService.deleteById(id);
        return ResponseEntity.ok("삭제 완료");
    }
}
