package com.genai.demo.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SampleExtraction {
    private String inventoryId;
    private String materialName;
    private String materialCode;
    private String supplierCode;
    private String catalog;
    private String supplierName;
    private String amountLeft;
    private String concentration;
    private String owner;
    private String manufacturer;
    private String lot;
    private String expiry;
    private String additionalInfo;
}
