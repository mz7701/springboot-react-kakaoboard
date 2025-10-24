package com.example.kakaoboard.service;

import com.example.kakaoboard.domain.Comment;
import com.example.kakaoboard.domain.Debate;
import com.example.kakaoboard.repository.CommentRepository;
import com.example.kakaoboard.repository.DebateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DebateService {

    private final DebateRepository debateRepository;
    private final CommentRepository commentRepository;

    public List<Debate> findAll() {
        return debateRepository.findAll();
    }

    public Debate createDebate(Debate debate) {
        return debateRepository.save(debate);
    }

    public Debate like(Long id) {
        Debate debate = debateRepository.findById(id).orElseThrow();
        debate.setLikes(debate.getLikes() + 1);
        return debateRepository.save(debate);
    }

    public Debate dislike(Long id) {
        Debate debate = debateRepository.findById(id).orElseThrow();
        debate.setDislikes(debate.getDislikes() + 1);
        return debateRepository.save(debate);
    }

    public Comment addComment(Long debateId, Comment comment) {
        Debate debate = debateRepository.findById(debateId).orElseThrow();
        comment.setDebate(debate);
        return commentRepository.save(comment);
    }

    public void deleteById(Long id) {
        debateRepository.deleteById(id);
    }
}
