package com.genai.demo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "sample_inventory")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SampleInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long inventoryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sample_id", nullable = false)
    private Sample sample;

    @Column(nullable = false)
    private String storageLocation;

    @Column(precision = 6, scale = 2)
    private BigDecimal quantityMl;

    private String storageTemperature;

    private LocalDate expiryDate;

    private LocalDate lastUpdated;
}
