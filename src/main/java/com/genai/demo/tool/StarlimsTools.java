package com.genai.demo.tool;

import com.genai.demo.entity.Sample;
import com.genai.demo.service.AIService;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StarlimsTools {

    private final AIService aiService;

    @Tool(name = "create_sample", description = "Creates a new sample with sample name and lab technician. ")
    public String createSample(@ToolParam(description = "Sample name (Required Parameter). If not present, please ask the user to provide it.") String sampleName,

                               @ToolParam(description = "Lab Technician name (Required Parameter). If not present, please ask the user to provide it but DO NOT GUESS IT OR FIND FROM YOUR KNOWLEDGE BASE.") String labTechnician
                               ){

        if(labTechnician==null || labTechnician.length()==0){
            return ("No Lab Technician Name Found. Please provide it");
        }
        return aiService.createSample(sampleName,labTechnician);
    }

    @Tool(name = "get_sample", description = "Returns the sample details of a particular sampleId")
    public Sample getSample(@ToolParam(description = "Sample ID (Required Parameter). If not present, please ask the user to provide it.") Long sampleId
    ){
            return aiService.getSample(sampleId);
    }
}

