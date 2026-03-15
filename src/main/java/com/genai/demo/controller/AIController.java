package com.genai.demo.controller;

import com.genai.demo.dto.PromptRequest;
import com.genai.demo.service.AIService;
import com.genai.demo.service.ReportService;
import lombok.RequiredArgsConstructor;
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

    //private final AIService aiService;
    private final ReportService reportService;

   /* @GetMapping("/joke/{query}")
    public ResponseEntity<String> getResponse(@PathVariable String query){
        String response=aiService.getJoke(query + "what is Dog");
        return ResponseEntity.ok("Hello"+response);
    }

    @GetMapping("/test")
    public ResponseEntity<String> getResponse(){
        String response="Hello";
        return ResponseEntity.ok(response);
    }*/

    @PostMapping("/generateReport")
    public ResponseEntity<List<Map<String, Object>>> generateReport(
            @RequestBody PromptRequest request) {

        List<Map<String, Object>> result =
                reportService.generateReport(request.getPrompt());

        return ResponseEntity.ok(result);
    }
}
