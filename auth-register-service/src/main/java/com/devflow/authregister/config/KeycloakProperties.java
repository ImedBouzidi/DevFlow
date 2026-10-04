package com.devflow.authregister.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "keycloak")
public record KeycloakProperties(
                String adminBaseUrl,
                String realm,
                String clientId,
                String clientSecret,
                String defaultRole,
                String adminSeedUsername,
                String adminSeedEmail,
                String adminSeedPassword,
                String adminSeedRole) {
}
