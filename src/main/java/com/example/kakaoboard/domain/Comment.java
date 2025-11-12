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

    private String author;
    private String text;
    private String ipAddress;
    private LocalDateTime createdAt = LocalDateTime.now();

    /** ✅ Debate와 연결 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debate_id")
    @JsonBackReference("debate-comments")
    private Debate debate;

    /** ✅ 부모 댓글 (자기 참조) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @JsonBackReference("comment-replies")
    private Comment parent;

    /** ✅ 자식 댓글 (무한 대댓글 구조) */
    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @JsonManagedReference("comment-replies")
    private List<Comment> replies = new ArrayList<>();

    /** ✅ 편의 메서드 */
    public void addReply(Comment reply) {
        replies.add(reply);
        reply.setParent(this);
    }
}
