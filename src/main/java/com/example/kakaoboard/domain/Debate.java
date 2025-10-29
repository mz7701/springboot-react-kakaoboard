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

    // ✅ 반박 정보
    private String rebuttalTitle;
    private String rebuttalContent;
    private String rebuttalAuthor;
    private LocalDateTime rebuttalAt; // 반박 등록 시각


    // ✅ 투표 관련
    private int authorVotes = 0;
    private int rebuttalVotes = 0;

    // ✅ 투표자 목록 (별도 테이블로 자동 생성됨)
    @ElementCollection
    @CollectionTable(
            name = "debate_voters",                      // 🔥 테이블 이름
            joinColumns = @JoinColumn(name = "debate_id") // FK 이름
    )
    @Column(name = "voter") // 컬럼 이름
    private List<String> voters = new ArrayList<>();

    // ✅ 상태 관련
    private boolean isClosed = false;
    private LocalDateTime createdAt;
    private LocalDateTime closedAt;

    // ✅ 좋아요 / 싫어요
    private int likes = 0;
    private int dislikes = 0;

    @JsonManagedReference("debate-comments") // 👈 이름 부여 (Comment와 쌍)
    @OneToMany(mappedBy = "debate", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> comments = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
