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

    // ✅ 共通IP取得ユーティリティ（ここに集約）
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty()) ip = request.getRemoteAddr();
        if (ip.contains(",")) ip = ip.split(",")[0].trim();
        if ("0:0:0:0:0:0:0:1".equals(ip)) ip = "127.0.0.1";
        return ip;
    }

    /**
     * ✅ すべての討論取得
     */
    public List<Debate> findAll() {
        return debateRepository.findAll();
    }

    /**
     * ✅ 新規討論作成
     */
    public Debate createDebate(Debate debate) {
        return debateRepository.save(debate);
    }

    /**
     * ✅ いいね
     */
    public Debate like(Long id) {
        return debateRepository.findById(id).map(d -> {
            d.setLikes(d.getLikes() + 1);
            return debateRepository.save(d);
        }).orElse(null);
    }

    /**
     * ✅ よくないね
     */
    public Debate dislike(Long id) {
        return debateRepository.findById(id).map(d -> {
            d.setDislikes(d.getDislikes() + 1);
            return debateRepository.save(d);
        }).orElse(null);
    }

    /**
     * ✅ コメント追加
     */
    public Comment addComment(Long debateId, Comment comment, HttpServletRequest request) {
        Debate debate = debateRepository.findById(debateId)
                .orElseThrow(() -> new RuntimeException("討論が見つかりません。"));
        comment.setDebate(debate);
        comment.setCreatedAt(LocalDateTime.now());

        comment.setIpAddress(getClientIp(request));

        return commentRepository.save(comment);
    }

    /** ✅ 返信コメント追加（IPも保存） */
    public Comment addReply(Long debateId, Long parentId, Comment reply, HttpServletRequest request) {
        Debate debate = debateRepository.findById(debateId)
                .orElseThrow(() -> new RuntimeException("討論が見つかりません。"));

        Comment parent = commentRepository.findById(parentId)
                .orElseThrow(() -> new RuntimeException("親コメントが見つかりません。"));

        reply.setDebate(debate);
        reply.setParent(parent);
        reply.setCreatedAt(LocalDateTime.now());

        reply.setIpAddress(getClientIp(request));

        return commentRepository.save(reply);
    }

    /**
     * ✅ 討論削除
     */
    public void deleteById(Long id) {
        debateRepository.deleteById(id);
    }

    /**
     * ✅ 勝者判定
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
     * ✅ 自動クローズ機能（1分ごとにチェック）
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
                    System.out.println("✅ 自動クローズされた討論: " + d.getTitle());
                }
            }
        }
    }

    /**
     * ✅ 第三者投票機能
     */
    public ResponseEntity<?> vote(Long id, Map<String, String> body) {
        String type = body.get("type");
        String voter = body.get("voter");

        Debate debate = debateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("討論が見つかりません。"));

        if (voter.equals(debate.getAuthor()) || voter.equals(debate.getRebuttalAuthor())) {
            return ResponseEntity.badRequest().body("ご本人は投票できません！");
        }

        if (debate.getVoters() == null) {
            debate.setVoters(new ArrayList<>());
        }
        if (debate.getVoters().contains(voter)) {
            return ResponseEntity.badRequest().body("この討論にはすでに投票済みです！");
        }

        switch (type) {
            case "author" -> debate.setAuthorVotes(debate.getAuthorVotes() + 1);
            case "rebuttal" -> debate.setRebuttalVotes(debate.getRebuttalVotes() + 1);
            default -> {
                return ResponseEntity.badRequest().body("不正な投票タイプです。");
            }
        }

        debate.getVoters().add(voter);
        debateRepository.save(debate);

        return ResponseEntity.ok("✅ 投票が完了しました！");
    }

    // DebateService.java 内に追加：返信コメントを Comment として登録
    public Comment addReplyAsComment(Long debateId, Long parentId, Comment reply) {
        Debate debate = debateRepository.findById(debateId)
                .orElseThrow(() -> new RuntimeException("討論が見つかりません。"));
        Comment parent = commentRepository.findById(parentId)
                .orElseThrow(() -> new RuntimeException("親コメントが見つかりません。"));

        reply.setDebate(debate);
        reply.setParent(parent);
        reply.setCreatedAt(LocalDateTime.now());
        parent.addReply(reply); // ✅ 親コメントに直接追加
        return commentRepository.save(reply);
    }

    /** ✅ コメントツリー（重複なしの無限ネスト返信を完全サポート） */
    public List<Comment> getCommentTree(Long debateId) {
        // 1️⃣ 親コメントのみ取得
        List<Comment> roots = commentRepository.findByDebateIdAndParentIsNull(debateId);

        // 2️⃣ 各親コメントに対して、再帰的に子コメントを埋める
        for (Comment root : roots) {
            fillRepliesRecursively(root);
        }

        // 3️⃣ 時間順にソート
        roots.sort(Comparator.comparing(Comment::getCreatedAt));
        return roots;
    }

    /** ✅ 再帰的にすべての子コメントをロード */
    private void fillRepliesRecursively(Comment comment) {
        List<Comment> replies = commentRepository.findByParentId(comment.getId());
        replies.sort(Comparator.comparing(Comment::getCreatedAt));
        comment.setReplies(replies);

        for (Comment reply : replies) {
            fillRepliesRecursively(reply);
        }
    }

}
