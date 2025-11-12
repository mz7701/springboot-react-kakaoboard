package com.example.kakaoboard.domain;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reply {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String author;
    private String text;
    private LocalDateTime createdAt;

    /** ✅ Debate 연결 */
    @JsonBackReference("debate-replies")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debate_id")
    private Debate debate;

    /** ✅ 부모 댓글 연결 (Comment와 매핑) */
    @JsonBackReference("comment-replies")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id")
    private Comment parentComment;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
