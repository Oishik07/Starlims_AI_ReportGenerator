/*package com.genai.demo.Service;

import com.genai.demo.service.AIService;
import com.genai.demo.service.ReportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class AIServiceTests {

    @Autowired
    private AIService aiService;

    @Autowired
    private ReportService rs;

    @Test
    public void testGetJoke(){
        var joke=aiService.getJoke("tell me something about monkey");
        System.out.println(joke);
    }

    @Test
    public void testEmbedText(){
        var embed=aiService.getEmbedding("Doing the next Big thing now!");
        System.out.println(embed.length);

        for(float e: embed){
            System.out.print(e+" ");
        }
    }

    @Test
    public void testStoreData(){
        aiService.ingestDataToVectorStore();
    }

    @Test
    public void testSimilaritySearch(){
        var response=aiService.similaritySearch("Movie about superpower");
        System.out.println(response);
    }

    @Test
    public void reportSertvice(){

    }


}*/