package com.genai.demo.service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${spring.ai.openai.chat.options.model:qwen/qwen-2.5-72b-instruct}")
    private String modelName;


    public Map<String, Object> generateReport(String userPrompt) {
        try {
            Map<String, String> step1 = generateValidatedSql(userPrompt);
            return executeReport(userPrompt, step1.get("sql"), step1.get("summary"),
                    step1.get("confidence"), step1.get("reason"));
        } catch (Exception e) {
            log.error("Error generating report", e);
            throw new RuntimeException("Failed to generate report");
        }
    }

    // ============================
    // 🔹 Step 1: Generate + Validate SQL only
    // ============================
    public Map<String, String> generateValidatedSql(String userPrompt) {
        String finalPrompt = buildPrompt(userPrompt);
        Map<String, String> result = aiService.generateSqlWithSummary(finalPrompt);
        String cleanedSql = cleanSql(result.get("sql"));
        validateSQL(cleanedSql);
        log.info("Step — SQL: {}, Confidence: {}", cleanedSql, result.get("confidence"));
        return Map.of(
                "sql",        cleanedSql,
                "summary",    result.getOrDefault("summary", ""),
                "confidence", result.getOrDefault("confidence", "medium"),
                "reason",     result.getOrDefault("reason", "")
        );
    }

    // ============================
    // 🔹 Step 2: Execute SQL + enrich response
    // ============================
    public Map<String, Object> executeReport(String userPrompt, String validatedSql,
                                             String summary, String confidence, String reason) {
        List<Map<String, Object>> result = jdbcTemplate.queryForList(validatedSql);
        log.info("Step — Executed SQL. Rows: {}", result.size());
        return Map.of(
                "sql",        validatedSql,
                "data",       result,
                "summary",    summary    != null ? summary    : "",
                "confidence", confidence != null ? confidence : "medium",
                "reason",     reason     != null ? reason     : "",
                "model",      modelName
        );
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
                    
                Example query 1:
                User request: "Show me all samples"
                {
                  "sql": "SELECT * FROM samples LIMIT 10;",
                  "summary": "Retrieving all samples from the database.",
                  "confidence": "high",
                  "reason": "Direct request for all samples maps clearly to the samples table."
                }
                
                Example query 2:
                User request: "Show me negative test results"
                {
                  "sql": "SELECT s.sample_name, tr.result_value FROM samples s JOIN test_results tr ON s.id = tr.sample_id WHERE tr.result_value ILIKE '%%Negative%%';",
                  "summary": "Joining samples with test results to find negative outcomes.",
                  "confidence": "high",
                  "reason": "Matches the 'Negative' keyword in the test_results table."
                }

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
                - Do not invent new columns.
                - ALWAYS append "LIMIT 10" to every generated query for pagination optimization.
                
                Relationship Rules:
                - samples.id = sample_inventory.sample_id (one-to-many)
                - samples.id = test_results.sample_id (one-to-many)
                
                Business Logic:
                - Only samples with status = 'PROCESSED' can have test results.
                - Inventory quantity_ml must be >= 0.
                - Expired samples are identified when expiry_date < CURRENT_DATE.
                - Abnormal test results are identified when result_status = 'ABNORMAL'.

                Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation outside the JSON):
                {
                  "sql": "<the complete PostgreSQL SELECT query with newlines as \n>",
                  "summary": "<2-3 sentence plain-English explanation for a scientist: which table, what filters, what will be returned>",
                  "confidence": "<high | medium | low — based on how clearly the user request maps to the schema>",
                  "reason": "<1 sentence explaining the confidence level in terms of schema alignment, query clarity, and retrieval accuracy>"
                }

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
            // Use regex word boundaries (\b) to avoid matching "add" inside "addiction" or "drop" inside "droplets"
            if (lowerSql.matches(".*\\b" + keyword + "\\b.*")) {
                throw new RuntimeException("Dangerous SQL detected: " + keyword);
            }
        }
    }

    // ============================
    // 🔹 SQL Cleaner (strips markdown code fences)
    // ============================
    private String cleanSql(String rawSql) {
        if (rawSql == null) return "";

        String cleaned = rawSql.trim();

        // Remove ```sql ... ``` or ``` ... ```
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceAll("^```[a-zA-Z]*\\n?", ""); // strip opening fence
            cleaned = cleaned.replaceAll("```$", "");               // strip closing fence
            cleaned = cleaned.trim();
        }

        return cleaned;
    }
}
