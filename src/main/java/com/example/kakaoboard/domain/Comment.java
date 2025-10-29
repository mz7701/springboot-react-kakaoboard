package com.example.kakaoboard.domain;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Comment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String author;
    private String text;
    private LocalDateTime createdAt;

    // Debate ↔ Comment
    @JsonBackReference("debate-comments")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debate_id")
    private Debate debate;

    // ✅ Comment ↔ Reply (대댓글은 별도 엔티티)
    @JsonManagedReference("comment-replies")
    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Reply> replies = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
