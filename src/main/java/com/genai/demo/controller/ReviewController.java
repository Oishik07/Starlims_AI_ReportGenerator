package com.genai.demo.controller;

import com.genai.demo.entity.ReportReview;
import com.genai.demo.entity.ReportStatus;
import com.genai.demo.repository.ReportReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReportReviewRepository repository;

    @PostMapping
    public ResponseEntity<?> submitReview(@RequestBody Map<String, String> payload) {
        try {
            ReportReview review = ReportReview.builder()
                    .userQuery(payload.get("userQuery"))
                    .generatedSql(payload.get("sql"))
                    .summary(payload.get("summary"))
                    .resultData(payload.get("resultData"))
                    .status(ReportStatus.PENDING)
                    .createdAt(LocalDateTime.now())
                    .build();
            
            repository.save(review);
            return ResponseEntity.ok(Map.of("message", "Report sent for review successfully", "id", review.getId()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Failed to submit review"));
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllReviews(@RequestParam(required = false) String status) {
        try {
            List<ReportReview> reviews;
            if (status != null) {
                reviews = repository.findByStatusOrderByCreatedAtDesc(ReportStatus.valueOf(status.toUpperCase()));
            } else {
                reviews = repository.findAllByOrderByCreatedAtDesc();
            }
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch reviews"));
        }
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveReview(@PathVariable Long id) {
        try {
            return repository.findById(id).map(review -> {
                review.setStatus(ReportStatus.APPROVED);
                review.setUpdatedAt(LocalDateTime.now());
                repository.save(review);
                return ResponseEntity.ok(Map.of("message", "Report approved successfully"));
            }).orElse(ResponseEntity.status(404).body(Map.of("error", "Review not found")));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to approve review"));
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectReview(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            return repository.findById(id).map(review -> {
                review.setStatus(ReportStatus.REJECTED);
                review.setUpdatedAt(LocalDateTime.now());
                review.setRejectionReason(payload.get("reason"));
                repository.save(review);
                return ResponseEntity.ok(Map.of("message", "Report rejected successfully"));
            }).orElse(ResponseEntity.status(404).body(Map.of("error", "Review not found")));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to reject review"));
        }
    }
}
