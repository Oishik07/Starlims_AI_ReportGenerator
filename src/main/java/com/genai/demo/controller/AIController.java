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

    //private final AIService aiService;
    public final ChatClient chatClient;
    public final StarlimsTools starlimsTools;
    private final ReportService reportService;

    @Autowired
    private ChatMemory chatMemory;

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

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody String message){

        String resp = chatClient.prompt()
                .system("Do not use any other tools or functions except provided. If any input parameters are missing in starlimsTools, do not proceed further" )
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
    public ResponseEntity<List<Map<String, Object>>> generateReport(
            @RequestBody PromptRequest request) {

        List<Map<String, Object>> result =
                reportService.generateReport(request.getPrompt());

        return ResponseEntity.ok(result);
    }
}
