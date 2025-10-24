package com.example.kakaoboard.controller;

import com.example.kakaoboard.domain.Comment;
import com.example.kakaoboard.domain.Debate;
import com.example.kakaoboard.service.DebateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/debates")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class DebateController {

    private final DebateService debateService;

    @GetMapping
    public ResponseEntity<List<Debate>> getAllDebates() {
        return ResponseEntity.ok(debateService.findAll());
    }

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

    @PostMapping("/{id}/like")
    public ResponseEntity<?> like(@PathVariable Long id) {
        return ResponseEntity.ok(debateService.like(id));
    }

    @PostMapping("/{id}/dislike")
    public ResponseEntity<?> dislike(@PathVariable Long id) {
        return ResponseEntity.ok(debateService.dislike(id));
    }

    @PostMapping("/{debateId}/comments")
    public ResponseEntity<?> addComment(@PathVariable Long debateId, @RequestBody Comment comment) {
        return ResponseEntity.ok(debateService.addComment(debateId, comment));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDebate(@PathVariable Long id) {
        debateService.deleteById(id);
        return ResponseEntity.ok("삭제 완료");
    }
}
