package com.devflow.gateway.config;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;

import static org.assertj.core.api.Assertions.assertThat;

class KeycloakJwtAuthenticationConverterTests {

    private final KeycloakJwtAuthenticationConverter converter =
            new KeycloakJwtAuthenticationConverter();

    @Test
    void mapsKeycloakRealmRolesAndScopes() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300))
                .subject("user-1")
                .claim("scope", "openid profile")
                .claim("realm_access", Map.of("roles", List.of("ROLE_MANAGER", "DEVELOPER")))
                .build();

        AbstractAuthenticationToken authentication = converter.convert(jwt);

        assertThat(authentication).isNotNull();
        assertThat(authentication.getAuthorities())
                .extracting("authority")
                .contains("SCOPE_openid", "SCOPE_profile", "ROLE_MANAGER", "ROLE_DEVELOPER");
    }
}
