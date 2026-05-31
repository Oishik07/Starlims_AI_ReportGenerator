package com.genai.demo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genai.demo.dto.PromptRequest;
import com.genai.demo.dto.SampleDTO;
import com.genai.demo.service.AIService;
import com.genai.demo.service.ReportService;
import com.genai.demo.tool.StarlimsTools;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/ai")
public class AIController {

    // private final AIService aiService;
    public final ChatClient chatClient;
    public final StarlimsTools starlimsTools;
    private final ReportService reportService;

    @Autowired
    private ChatMemory chatMemory;

    /*
     * @GetMapping("/joke/{query}")
     * public ResponseEntity<String> getResponse(@PathVariable String query){
     * String response=aiService.getJoke(query + "what is Dog");
     * return ResponseEntity.ok("Hello"+response);
     * }
     * 
     * @GetMapping("/test")
     * public ResponseEntity<String> getResponse(){
     * String response="Hello";
     * return ResponseEntity.ok(response);
     * }
     */

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody String message) {

        String resp = chatClient.prompt()
                .system("Do not use any other tools or functions except provided. If any input parameters are missing in starlimsTools, do not proceed further")
                .user(message)
                .tools(starlimsTools)
                .advisors(new SimpleLoggerAdvisor(),
                        MessageChatMemoryAdvisor.builder(chatMemory)
                                .conversationId("Oishik123")
                                .build())
                .call()
                .content();

        return ResponseEntity.ok(resp);

    }

    @PostMapping("/generateReport")
    public ResponseEntity<?> generateReport(
            @RequestBody PromptRequest request) {
        try {
            Map<String, Object> result = reportService.generateReport(request.getPrompt());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "error", e.getMessage() != null ? e.getMessage() : "Failed to generate report"
            ));
        }
    }

    // Step 1: Generate + validate SQL — returns sql, summary, confidence, reason (1
    // AI call)
    @PostMapping("/sql/generate")
    public ResponseEntity<?> generateSql(
            @RequestBody PromptRequest request) {
        try {
            Map<String, String> result = reportService.generateValidatedSql(request.getPrompt());
            return ResponseEntity.ok(Map.of(
                    "sql", result.get("sql"),
                    "summary", result.getOrDefault("summary", ""),
                    "confidence", result.getOrDefault("confidence", "medium"),
                    "reason", result.getOrDefault("reason", "")));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of(
                    "error", e.getMessage() != null ? e.getMessage() : "Failed to generate SQL query"
            ));
        }
    }

    // Step 2: Execute SQL + return data (0 AI calls — all enrichment from step 1)
    @PostMapping("/sql/execute")
    public ResponseEntity<?> executeSql(
            @RequestBody Map<String, String> request) {
        try {
            String prompt = request.get("prompt");
            String sql = request.get("sql");
            String summary = request.getOrDefault("summary", "");
            String confidence = request.getOrDefault("confidence", "medium");
            String reason = request.getOrDefault("reason", "");
            Map<String, Object> result = reportService.executeReport(prompt, sql, summary, confidence, reason);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "error", e.getMessage() != null ? e.getMessage() : "Failed to execute SQL query"
            ));
        }
    }
}
