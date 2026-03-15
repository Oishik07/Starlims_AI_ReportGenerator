package com.genai.demo.dto;

import lombok.Data;

import java.util.List;

@Data
public class LangCacheResponse {

    private List<CacheEntry> data;

    @Data
    public static class CacheEntry {
        private String response;
        private Double similarity;
    }
}
