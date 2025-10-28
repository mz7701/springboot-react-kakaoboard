package com.example.kakaoboard.domain;

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
public class Debate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String content;
    private String author;

    private int likes = 0;
    private int dislikes = 0;
    private int expBet = 0;
    private boolean isHot = false;

    private LocalDateTime createdAt;

    // ✅ 댓글 (1:N 관계)
    @JsonManagedReference
    @OneToMany(mappedBy = "debate", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> comments = new ArrayList<>();

    // ✅ 반박 기능 필드 추가
    private String rebuttalTitle;     // 반박 제목
    private String rebuttalContent;   // 반박 내용
    private String rebuttalAuthor;    // 반박 작성자

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
