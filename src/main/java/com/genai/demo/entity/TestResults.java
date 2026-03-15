package com.genai.demo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "test_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TestResults {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long resultId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sample_id", nullable = false)
    private Sample sample;

    @Column(nullable = false)
    private String testType;

    private String resultValue;

    private String unit;

    private String referenceRange;

    private String resultStatus; // NORMAL / ABNORMAL

    private String verifiedBy;

    private LocalDate verifiedDate;
}
