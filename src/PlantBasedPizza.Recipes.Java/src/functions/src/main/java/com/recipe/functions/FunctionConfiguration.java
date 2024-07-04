package com.recipe.functions;

import com.amazonaws.services.lambda.runtime.events.SQSEvent;
import com.amazonaws.services.lambda.runtime.events.SQSBatchResponse;
import com.recipe.core.IRecipeRepository;
import datadog.trace.api.Trace;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.function.context.FunctionRegistration;
import org.springframework.cloud.function.context.catalog.FunctionTypeUtils;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.support.GenericApplicationContext;

import java.util.ArrayList;
import java.util.List;

@SpringBootApplication(scanBasePackages = "com.recipe")
public class FunctionConfiguration{
    @Autowired
    IRecipeRepository recipeRepository;

    public static void main(String[] args) {
        SpringApplication.run(FunctionConfiguration.class, args);
    }
    
    @Bean
    public SQSBatchResponse handleOrderConfirmedEvent(SQSEvent evt) {
        List<SQSBatchResponse.BatchItemFailure> failures = new ArrayList<>();

        List<SQSEvent.SQSMessage> records = evt.getRecords();

        for (int i = 0, recordsSize = records.size(); i < recordsSize; i++) {
            SQSEvent.SQSMessage message = records.get(i);

            var processSuccess = processOrderConfirmedMessage(message);

            if (!processSuccess) {
                failures.add(SQSBatchResponse.BatchItemFailure.builder().withItemIdentifier(message.getMessageId()).build());
            }
        }

        return SQSBatchResponse.builder()
                .withBatchItemFailures(failures)
                .build();
    }

    @Trace(operationName = "ProcessingOrderConfirmedMessage", resourceName = "FunctionConfiguration.processOrderConfirmedMessage")
    public boolean processOrderConfirmedMessage(SQSEvent.SQSMessage message) {
        return true;
    }
}