package com.example.kakaoboard.controller;

import com.example.kakaoboard.domain.Comment;
import com.example.kakaoboard.domain.Debate;
import com.example.kakaoboard.domain.Reply;
import com.example.kakaoboard.repository.DebateRepository;
import com.example.kakaoboard.service.DebateService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.kakaoboard.repository.CommentRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/debates")
@RequiredArgsConstructor
@CrossOrigin(
        origins = {
                "http://localhost:3000",
                "http://192.168.0.21:3000",
                "https://kakaoboard-frontend.onrender.com"
        },
        allowedHeaders = "*",
        allowCredentials = "true"
)
public class DebateController {

    private final DebateService debateService;
    private final DebateRepository debateRepository;
    private final CommentRepository commentRepository;

    /** ✅ 全ての討論取得 + 自動クローズ */
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
                debateService.updateWinner(d);
                debateRepository.save(d);
            }
        }

        return ResponseEntity.ok(debates);
    }

    /** ✅ 新規討論作成 */
    @PostMapping
    public ResponseEntity<?> createDebate(@RequestBody Debate debate) {
        try {
            if (debate.getTitle() == null || debate.getContent() == null)
                return ResponseEntity.badRequest().body("タイトルと内容を入力してください。");
            if (debate.getAuthor() == null || debate.getAuthor().isEmpty())
                debate.setAuthor("匿名");

            debate.setCreatedAt(LocalDateTime.now());
            debate.setClosed(false);
            Debate saved = debateService.createDebate(debate);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    /** ✅ 手動クローズ */
    @PatchMapping("/{id}/close")
    public ResponseEntity<?> closeDebate(@PathVariable Long id) {
        Debate debate = debateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("該当する討論が見つかりません。"));

        if (debate.isClosed()) {
            return ResponseEntity.badRequest().body("すでにクローズされた討論です。");
        }

        debate.setClosed(true);
        debate.setClosedAt(LocalDateTime.now());
        debateRepository.save(debate);

        return ResponseEntity.ok("✅ 討論を手動でクローズしました。");
    }

    /** ✅ いいね / よくないね */
    @PostMapping("/{id}/like")
    public ResponseEntity<?> like(@PathVariable Long id) {
        return ResponseEntity.ok(debateService.like(id));
    }

    @PostMapping("/{id}/dislike")
    public ResponseEntity<?> dislike(@PathVariable Long id) {
        return ResponseEntity.ok(debateService.dislike(id));
    }

    /** ✅ コメント追加 */
    @PostMapping("/{debateId}/comments")
    public ResponseEntity<?> addComment(
            @PathVariable Long debateId,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {

        String author = (String) body.get("author");
        String text = (String) body.get("text");
        Long parentId = body.get("parentId") != null
                ? Long.parseLong(body.get("parentId").toString())
                : null;

        Comment comment = new Comment();
        comment.setAuthor(author != null ? author : "匿名");
        comment.setText(text);
        comment.setCreatedAt(LocalDateTime.now());

        // ✅ この1行を追加（IP保存）
        comment.setIpAddress(request.getRemoteAddr());

        Comment saved;
        if (parentId != null) {
            saved = debateService.addReply(debateId, parentId, comment, request);
        } else {
            saved = debateService.addComment(debateId, comment, request);
        }

        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{debateId}/comments/{parentId}/reply")
    public ResponseEntity<?> addReply(
            @PathVariable Long debateId,
            @PathVariable Long parentId,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) { // ✅ request 追加

        try {
            String author = (String) body.getOrDefault("author", "匿名");
            String text = (String) body.get("text");

            if (text == null || text.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("内容を入力してください。");
            }

            Comment reply = new Comment();
            reply.setAuthor(author);
            reply.setText(text);
            reply.setCreatedAt(LocalDateTime.now());

            // ✅ この1行を追加（IP保存）
            reply.setIpAddress(request.getRemoteAddr());

            Comment saved = debateService.addReplyAsComment(debateId, parentId, reply);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("返信コメント作成中にエラーが発生しました: " + e.getMessage());
        }
    }

    /** ✅ 反論登録 */
    @PostMapping("/{id}/rebuttal")
    public ResponseEntity<?> addRebuttal(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<Debate> opt = debateRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        Debate debate = opt.get();
        if (debate.getRebuttalTitle() != null)
            return ResponseEntity.badRequest().body("すでに反論が登録されている討論です。");

        debate.setRebuttalTitle(body.get("title"));
        debate.setRebuttalContent(body.get("content"));
        debate.setRebuttalAuthor(body.get("author"));
        debate.setRebuttalAt(LocalDateTime.now());
        debate.setClosed(false);
        debate.setClosedAt(null);

        debateRepository.save(debate);
        return ResponseEntity.ok(debate);
    }

    /** ✅ 投票機能 */
    @PostMapping("/{id}/vote")
    public ResponseEntity<?> vote(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            String type = (String) body.get("type");
            String voter = (String) body.get("voter");

            Optional<Debate> opt = debateRepository.findById(id);
            if (opt.isEmpty()) return ResponseEntity.notFound().build();

            Debate debate = opt.get();

            if (debate.getRebuttalTitle() == null)
                return ResponseEntity.badRequest().body("まだ反論が登録されていません。");

            if (debate.isClosed()) {
                LocalDateTime now = LocalDateTime.now();
                if (debate.getRebuttalAt() != null &&
                        Duration.between(debate.getRebuttalAt(), now).toHours() < 12) {
                    debate.setClosed(false);
                } else {
                    return ResponseEntity.badRequest().body("すでにクローズされた討論です。");
                }
            }

            if (debate.getAuthor().equals(voter) ||
                    (debate.getRebuttalAuthor() != null && debate.getRebuttalAuthor().equals(voter)))
                return ResponseEntity.badRequest().body("作成者および反論者は投票できません。");

            if (debate.getVoters() == null)
                debate.setVoters(new ArrayList<>());
            if (debate.getVoters().contains(voter))
                return ResponseEntity.badRequest().body("既に投票済みです。");

            if ("author".equals(type))
                debate.setAuthorVotes(debate.getAuthorVotes() + 1);
            else if ("rebuttal".equals(type))
                debate.setRebuttalVotes(debate.getRebuttalVotes() + 1);
            else
                return ResponseEntity.badRequest().body("不正な投票タイプです。");

            debate.getVoters().add(voter);
            debateRepository.save(debate);

            return ResponseEntity.ok(Map.of(
                    "message", "✅ 投票に成功しました。",
                    "authorVotes", debate.getAuthorVotes(),
                    "rebuttalVotes", debate.getRebuttalVotes()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("サーバーエラーが発生しました: " + e.getMessage());
        }
    }

    /** ✅ 討論削除 */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDebate(@PathVariable Long id) {
        debateService.deleteById(id);
        return ResponseEntity.ok("削除が完了しました。");
    }

    /** ✅ コメントツリー取得（無限ネストの返信構造を含む） */
    @GetMapping("/{debateId}/comments/tree")
    public ResponseEntity<List<Comment>> getTree(@PathVariable Long debateId) {
        return ResponseEntity.ok(debateService.getCommentTree(debateId));
    }

    /** ✅ コメント削除（該当討論に属するコメントのみ削除） */
    @DeleteMapping("/{debateId}/comments/{commentId}")
    public ResponseEntity<?> deleteComment(
            @PathVariable Long debateId,
            @PathVariable Long commentId
    ) {
        var opt = commentRepository.findByIdAndDebateId(commentId, debateId);

        if (opt.isEmpty()) {
            // リクエストされた討論に属していないか、存在しないコメントです。
            return ResponseEntity.notFound().build();
        }

        commentRepository.delete(opt.get());
        return ResponseEntity.ok("コメントの削除が完了しました。");
    }

    /** ✅ 討論編集（マイページで使用）
     *  - 反論中またはクローズ済みの討論は編集不可
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateDebate(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        try {
            Optional<Debate> opt = debateRepository.findById(id);
            if (opt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Debate debate = opt.get();

            // 🔒 反論中 / クローズ済みの討論は編集禁止
            if (debate.isClosed() || debate.getRebuttalTitle() != null) {
                return ResponseEntity
                        .badRequest()
                        .body("反論中またはクローズ済みの討論は編集できません。");
            }

            String title = body.get("title");
            String content = body.get("content");

            if (title == null || title.trim().isEmpty()
                    || content == null || content.trim().isEmpty()) {
                return ResponseEntity
                        .badRequest()
                        .body("タイトルと内容を両方入力してください。");
            }

            // ✏️ 実際に編集処理を行う
            debate.setTitle(title.trim());
            debate.setContent(content.trim());
            debateRepository.save(debate);

            return ResponseEntity.ok(debate);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity
                    .internalServerError()
                    .body("討論の編集中にエラーが発生しました: " + e.getMessage());
        }
    }

}
