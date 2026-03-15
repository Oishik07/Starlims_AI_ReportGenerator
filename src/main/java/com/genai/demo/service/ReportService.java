package com.genai.demo.service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService{

    private final JdbcTemplate jdbcTemplate;
    private final AIService aiService;

    public List<Map<String, Object>> generateReport(String userPrompt) {

        try {
            // 1️⃣ Build structured prompt for LLM
            String finalPrompt = buildPrompt(userPrompt);

            // 2️⃣ Call LLM → Generate SQL
            String generatedSql = aiService.generateSQL(finalPrompt);

            log.info("Generated SQL: {}", generatedSql);

            // 3️⃣ Validate SQL (CRITICAL)
            validateSQL(generatedSql);

            // 4️⃣ Execute SQL
            List<Map<String, Object>> result =
                    jdbcTemplate.queryForList(generatedSql);

            return result;

        } catch (Exception e) {
            log.error("Error generating report", e);
            throw new RuntimeException("Failed to generate report");
        }
    }

    // ============================
    // 🔹 Prompt Builder
    // ============================
    private String buildPrompt(String userPrompt) {
        return """
                You are a SQL generator.
                
                Database: PostgreSQL
                
                Use PostgreSQL syntax.
                
                
                Return ONLY one valid PostgreSQL SELECT query.
                
                SELECT column1, column2
                FROM samples
                WHERE condition;
                
                SELECT column1, column2
                FROM sample_inventory
                WHERE condition;
                
                SELECT column1, column2
                FROM test_results
                WHERE condition;
                
                Do not add explanation.

                Database schema:
                
                Table: samples
                - id (int)
                - created_date (date)
                - lab_technician (varchar)
                - sample_name (varchar)
                - status (varchar)
                - processed_date (date)
                
                
                Database schema:
                
                Table: sample_inventory
                    - inventory_id (int, primary key)
                    - sample_id (int, foreign key references samples.id)
                    - storage_location (varchar)
                    - quantity_ml (decimal)
                    - storage_temperature (varchar)
                    - expiry_date (date)
                    - last_updated (date)
                
                
                Description:
                    Stores physical inventory details of laboratory samples.
                    Each record represents storage and quantity information for a sample.
                    A sample can have multiple inventory records.
                
                
                
                Database schema:
                    Table: test_results
                    - result_id (int, primary key)
                    - sample_id (int, foreign key references samples.id)
                    - test_type (varchar)
                    - result_value (varchar)
                    - unit (varchar)
                    - reference_range (varchar)
                    - result_status (varchar: NORMAL / ABNORMAL)
                    - verified_by (varchar)
                    - verified_date (date)
                
                Description:
                    Stores diagnostic test results associated with laboratory samples.
                    Each record represents a test performed on a sample.
                    A sample can have multiple test results.
                    
                Some example of queries:
                
                Example query 1:
                
                SELECT sample_name, result_value
                FROM samples
                JOIN test_results ON samples.id = test_results.sample_id
                WHERE result_value = 'Negative';
                
                Example query 2:
                
                SELECT
                  s.id,
                  s.created_date,
                  s.lab_technician,
                  s.sample_name,
                  s.status,
                  s.processed_date,
                  si.storage_location,
                  si.quantity_ml,
                  si.storage_temperature,
                  si.expiry_date,
                  si.last_updated,
                  tr.sample_id,
                  tr.test_type,
                  tr.result_value,
                  tr.unit,
                  tr.reference_range,
                  tr.result_status,
                  tr.verified_by,
                  tr.verified_date
                FROM
                  samples s
                  LEFT JOIN sample_inventory si ON s.id = si.sample_id
                  LEFT JOIN test_results tr ON s.id = tr.sample_id AND tr.result_status = 'NORMAL'
                WHERE
                  s.status = 'PROCESSED';
                

                Rules:
                - Only generate SELECT queries
                - Return only ONE SQL query
                - Do not include explanation or text
                - Use only tables and columns defined in the schema
                - Use table aliases when joining tables
                - Use JOIN when data from multiple tables is required
                - Use CURRENT_DATE for today's date
                - For date subtraction use: CURRENT_DATE - INTERVAL 'X days'
                - Use ILIKE for case-insensitive matching
                - Do not generate INSERT, UPDATE, DELETE, DROP
                - Only use column names exactly as defined in the schema.
                -  Do not invent new columns.
                
                Relationship Rules:
                - samples.id = sample_inventory.sample_id (one-to-many)
                - samples.id = test_results.sample_id (one-to-many)
                
                Business Logic:
                - Only samples with status = 'PROCESSED' can have test results.
                - Inventory quantity_ml must be >= 0.
                - Expired samples are identified when expiry_date < CURRENT_DATE.
                - Abnormal test results are identified when result_status = 'ABNORMAL'.

                User request:
                "%s"
                """.formatted(userPrompt);
    }

    // ============================
    // 🔹 SQL Validation Layer
    // ============================
    private void validateSQL(String sql) {

        if (sql == null || sql.isBlank()) {
            throw new RuntimeException("Generated SQL is empty");
        }

        String lowerSql = sql.toLowerCase().trim();

        // Allow only SELECT
        if (!lowerSql.startsWith("select")) {
            throw new RuntimeException("Only SELECT queries are allowed");
        }

        // Block dangerous keywords
        List<String> blockedKeywords = List.of(
                "delete", "insert", "drop",
                "alter", "truncate", "add", "remove"
        );

        for (String keyword : blockedKeywords) {
            if (lowerSql.contains(keyword)) {
                throw new RuntimeException("Dangerous SQL detected");
            }
        }
    }
}