package com.example.ticketbooking.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        final String securitySchemeName = "BearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("High-Concurrency Ticket Booking System API")
                        .version("1.0.0")
                        .description("Production-grade high-concurrency ticket booking engine in Spring Boot 3 / Java 21. " +
                                "Demonstrates 3-tier race protection: Redis distributed locking (Layer 1), " +
                                "PostgreSQL row-level pessimistic locking (Layer 2), and database unique constraints (Layer 3) " +
                                "with post-commit Kafka event-driven notification dispatch.")
                        .contact(new Contact().name("Engineering Team"))
                        .license(new License().name("Apache 2.0")))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                                .name(securitySchemeName)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Enter JWT Bearer token obtained from /api/auth/login or /api/auth/register")));
    }
}
