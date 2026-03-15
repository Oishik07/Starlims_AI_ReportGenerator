/*package com.genai.demo.Service;

import com.genai.demo.service.RAGService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class RAGServiceTests {

    @Autowired
    private RAGService ragService;

    @Test
    public void testIngest(){
        ragService.ingestPdfToVectorStore();
    }

    @Test
    public void testAskAI(){
        //var response=ragService.askAI("What is cricket and who is Virat Kohli and what is Bat and what are the rules of it? tell in short..");
        var response=ragService.askAI("Who is the rule of cricket and why cricket is so loved");
        System.out.println(response);
    }
}*/