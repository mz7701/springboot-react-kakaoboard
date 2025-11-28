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

    /** ✅ Debate との関連付け */
    @JsonBackReference("debate-replies")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debate_id")
    private Debate debate;

    /** ✅ 親コメントとの関連付け（Comment とのマッピング） */
    @JsonBackReference("comment-replies")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id")
    private Comment parentComment;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
