package com.example.kakaoboard.domain;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String author;          // 投稿者
    private String text;            // コメント内容
    private String ipAddress;       // IP アドレス
    private LocalDateTime createdAt = LocalDateTime.now();  // 作成日時

    /** ✅ Debate と紐づく（N:1） */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debate_id")
    @JsonBackReference("debate-comments")
    private Debate debate;

    /** ✅ 親コメント（自己参照） */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @JsonBackReference("comment-replies")
    private Comment parent;

    /** ✅ 子コメント一覧（無限にネスト可能な返信ツリー） */
    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @JsonManagedReference("comment-replies")
    private List<Comment> replies = new ArrayList<>();

    /** ✅ 便利メソッド：子コメントを追加 */
    public void addReply(Comment reply) {
        replies.add(reply);
        reply.setParent(this);
    }
}
