/*package com.genai.demo.service;

import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RAGService {

    private final ChatClient chatClient;
    private final VectorStore vectorStore;

    @Value("classpath:cricket.pdf")
    Resource pdfFile;


    public void ingestPdfToVectorStore(){
        PagePdfDocumentReader reader=new PagePdfDocumentReader(pdfFile);
        List<Document> pages=reader.get();

        TokenTextSplitter tokenTextSplitter = TokenTextSplitter.builder()
                .withChunkSize(200)
                .build();

        List<Document> chunks = tokenTextSplitter.apply(pages);
        vectorStore.add(chunks);
    }

    public String askAI(String prompt){
        String template= """
                You are an AI Assistant.
                
                Rules:
                
                1. Use only the information provided in the context
                2. You may rephrase, summarize and explain in natural language.
                3. Do not introduce new concepts or facts.
                4. If multiple context sections are relevant, combine them into a single explanation.
                5. If answer is not present, say "Sorry, I don't know this".
                
                Context:
                {context}
                
                Answer in friendly, conversational tone.
                """;

        List<Document> documents =vectorStore.similaritySearch(SearchRequest.builder()
                        .query(prompt)
                        .topK(3)
                        .similarityThreshold(0.4)
                        .filterExpression("file_name == 'cricket.pdf'")
                        .build());

        String context=documents.stream()
                .map(Document::getText)
                .collect(Collectors.joining("\n\n"));

        PromptTemplate promptTemplate=new PromptTemplate(template);
        String systemPrompt=promptTemplate.render(Map.of("context",context));

        return chatClient.prompt()
                .system(systemPrompt)
                .user(prompt)
                .advisors(new SimpleLoggerAdvisor())
                .call()
                .content();

    }
}
*/