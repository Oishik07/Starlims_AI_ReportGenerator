/*package com.genai.demo.service;

import com.genai.demo.dto.LangCacheResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
@RequiredArgsConstructor
class LangCacheService {

    private final WebClient webClient;

    @Value("${langcache.api.key}")
    private String apiKey;

    @Value("${langcache.base.url}")
    private String baseUrl;

    public LangCacheResponse search(String query) {
        return webClient.post()
                .uri(baseUrl + "/v1/caches/" + "" + "/entries/search")
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .bodyValue(Map.of(
                        "prompt", query,
                        "topK", 1,
                        "similarityThreshold", 0.85
                ))
                .retrieve()
                .onStatus(
                        status -> status.isError(),
                        response -> response.bodyToMono(String.class)
                                .map(body -> new RuntimeException("LangCache Error: " + body))
                )
                .bodyToMono(LangCacheResponse.class)  // deserialize directly
                .block();
    }

    public void store(String query, String response) {
        webClient.post()
                .uri(baseUrl + "/v1/caches/" + "" + "/entries")
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")  // was missing!
                .bodyValue(Map.of(
                        "prompt", query,
                        "response", response,
                        "ttlMillis", 60000
                ))
                .retrieve()
                .onStatus(
                        status -> status.isError(),
                        resp -> resp.bodyToMono(String.class)
                                .map(body -> new RuntimeException("LangCache Store Error: " + body))
                )
                .bodyToMono(Void.class)
                .block();
    }

}*/