package com.genai.demo.repository;

import com.genai.demo.entity.ReportReview;
import com.genai.demo.entity.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportReviewRepository extends JpaRepository<ReportReview, Long> {
    List<ReportReview> findByStatusOrderByCreatedAtDesc(ReportStatus status);
    List<ReportReview> findAllByOrderByCreatedAtDesc();
}
