package com.example.kakaoboard.controller;

import com.example.kakaoboard.domain.Comment;
import com.example.kakaoboard.domain.Debate;
import com.example.kakaoboard.service.DebateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/debates")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class DebateController {

    private final DebateService debateService;

    // ✅ 전체 토론 조회
    @GetMapping
    public ResponseEntity<List<Debate>> getAllDebates() {
        return ResponseEntity.ok(debateService.findAll());
    }

    // ✅ 토론 등록
    @PostMapping
    public ResponseEntity<?> createDebate(@RequestBody Debate debate) {
        try {
            if (debate.getTitle() == null || debate.getContent() == null)
                return ResponseEntity.badRequest().body("제목과 내용을 입력하세요.");

            if (debate.getAuthor() == null || debate.getAuthor().isEmpty())
                debate.setAuthor("익명");

            debate.setCreatedAt(LocalDateTime.now());
            return ResponseEntity.ok(debateService.createDebate(debate));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    // ✅ 좋아요
    @PostMapping("/{id}/like")
    public ResponseEntity<?> like(@PathVariable Long id) {
        return ResponseEntity.ok(debateService.like(id));
    }

    // ✅ 싫어요
    @PostMapping("/{id}/dislike")
    public ResponseEntity<?> dislike(@PathVariable Long id) {
        return ResponseEntity.ok(debateService.dislike(id));
    }

    // ✅ 댓글 추가
    @PostMapping("/{debateId}/comments")
    public ResponseEntity<?> addComment(@PathVariable Long debateId, @RequestBody Comment comment) {
        return ResponseEntity.ok(debateService.addComment(debateId, comment));
    }

    // ✅ 반박 추가 기능 (여기 추가됨)
    @PostMapping("/{id}/rebuttal")
    public ResponseEntity<?> addRebuttal(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            Debate debate = debateService.findById(id);

            // 이미 반박이 존재하면 에러 반환
            if (debate.getRebuttalTitle() != null)
                return ResponseEntity.badRequest().body("이미 반박이 등록되었습니다.");

            debate.setRebuttalTitle(body.get("title"));
            debate.setRebuttalContent(body.get("content"));
            debate.setRebuttalAuthor(body.get("author"));

            debateService.save(debate);
            return ResponseEntity.ok("반박 등록 완료");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("반박 등록 실패: " + e.getMessage());
        }
    }

    // ✅ 토론 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDebate(@PathVariable Long id) {
        debateService.deleteById(id);
        return ResponseEntity.ok("삭제 완료");
    }
}
