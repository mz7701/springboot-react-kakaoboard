package com.example.kakaoboard.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
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

    private String winner; // "author", "rebuttal", "draw" のいずれかを保持

    @Column(nullable = false)
    private String category; // ✅ ゲーム・社会・恋愛・スポーツ・その他 のカテゴリ

    // ✅ 反論（リバタル）情報
    private String rebuttalTitle;
    private String rebuttalContent;
    private String rebuttalAuthor;
    private LocalDateTime rebuttalAt; // 反論が登録された日時

    // ✅ 投票関連
    private int authorVotes = 0;
    private int rebuttalVotes = 0;

    // ✅ 投票者リスト（別テーブルとして自動生成される）
    @ElementCollection
    @CollectionTable(
            name = "debate_voters",                       // 🔥 テーブル名
            joinColumns = @JoinColumn(name = "debate_id") // 外部キー名
    )
    @Column(name = "voter") // カラム名
    private List<String> voters = new ArrayList<>();

    // ✅ ステータス関連
    @JsonProperty("isClosed")
    private boolean isClosed = false; // true の場合、このディベートは締め切り済み

    private LocalDateTime createdAt;
    private LocalDateTime closedAt;

    // ✅ いいね / よくないね
    private int likes = 0;
    private int dislikes = 0;

    // ✅ コメント（循環参照防止用）
    @OneToMany(mappedBy = "debate", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference(value = "debate-comments") // ✅ ← 正しい側（親側）に付与

    private List<Comment> comments = new ArrayList<>();

    // ✅ 返信（Reply）
    @OneToMany(mappedBy = "debate", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference(value = "debate-replies")
    private List<Reply> replies = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
