package com.genai.demo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "samples")
public class Sample{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sample_name")
    private String sampleName;

    @Column(name = "status")
    private String status;

    @Column(name = "processed_date")
    private LocalDate processedDate;

    @Column(name = "created_date")
    private LocalDate createdDate;

    @Column(name = "lab_technician")
    private String labTechnician;

    @OneToMany(mappedBy = "sample", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SampleInventory> inventories = new ArrayList<>();

    @OneToMany(mappedBy = "sample", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TestResults> testResults = new ArrayList<>();
}