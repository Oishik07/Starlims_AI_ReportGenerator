package com.genai.demo.service;

import com.genai.demo.dto.LangCacheResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import javax.print.Doc;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AIService {

    private final ChatClient chatClient;

    /*private final EmbeddingModel embeddingModel;

    private final VectorStore vectorStore;

    private final LangCacheService langCacheService;

    private static final double THRESHOLD = 0.85;

    public float[] getEmbedding(String text){
        return embeddingModel.embed(text);
    }

    public void ingestDataToVectorStore(){

        List<Document> movies = List.of(
                new Document("A thief who steals corporate secrets through the use of dream-sharing technology.",
                        Map.of("title","Inception","genre","Sci-Fi","year",2010)),

                new Document("A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
                        Map.of("title","Intersteller","genre","Sci-Fi","year",2014)),

                new Document("A poor yet passionate young man falls in love with a rich young woman, giving her a sense of freedom.",
                        Map.of("title","The Notebook","genre","Romance","year",2004)),

                new Document("A computer hacker learns about the true nature of reality and his role in the war against its controllers.",
                        Map.of("title","The Matrix","genre","Sci-Fi","year",1999)),

                new Document("A young lion prince flees his kingdom after the death of his father and learns the true meaning of responsibility.",
                        Map.of("title","The Lion King","genre","Animation","year",1994)),

                new Document("A skilled detective investigates a series of mysterious murders linked to a dangerous criminal mastermind.",
                        Map.of("title","Se7en","genre","Thriller","year",1995)),

                new Document("A musician and an aspiring actress struggle to balance love and career ambitions in a modern city.",
                        Map.of("title","La La Land","genre","Romance","year",2016)),

                new Document("A group of superheroes unite to protect Earth from an alien invasion threatening humanity.",
                        Map.of("title","The Avengers","genre","Action","year",2012)),

                new Document("A young wizard discovers his magical heritage and attends a school of witchcraft and wizardry.",
                        Map.of("title","Harry Potter and the Sorcerer's Stone","genre","Fantasy","year",2001)),

                new Document("A man with short-term memory loss attempts to track down his wife's killer using notes and tattoos.",
                        Map.of("title","Memento","genre","Thriller","year",2000))
        );


        vectorStore.add(movies);
    }


    public List<Document> similaritySearch(String text){
        return vectorStore.similaritySearch(SearchRequest.builder()
                        .query(text)
                        .topK(3)
                .build());
    }



    public String getJoke(String topic) {
        long t1 = System.currentTimeMillis();
        LangCacheResponse result = langCacheService.search(topic);
        long t2 = System.currentTimeMillis();
        System.out.println("LangCache search took: " + (t2 - t1) + "ms");

        if (result != null &&
                result.getData() != null &&
                !result.getData().isEmpty()) {

            System.out.println("LangCache HIT"+ result.getData());
            return result.getData().get(0).getResponse();
        }

        System.out.println("LangCache MISS");

        // Single call — reuse the same response for both caching and returning
        String response = chatClient
                .prompt()
                .user("Explain in short: " + topic)
                .advisors(new SimpleLoggerAdvisor())
                .call()
                .content();

        langCacheService.store(topic, response);

        return response;
    }*/

    public String generateSQL(String userQuery){

        var resp= chatClient
                .prompt()
                .user(userQuery)
                .advisors(new SimpleLoggerAdvisor())
                .call()
                .content();

        return resp.toString();
    }
}
