package com.devflow.incident.config;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import static org.assertj.core.api.Assertions.assertThat;

class KeycloakJwtGrantedAuthoritiesConverterTest {

    private final KeycloakJwtGrantedAuthoritiesConverter converter =
            new KeycloakJwtGrantedAuthoritiesConverter();

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

        assertThat(converter.convert(jwt))
                .extracting("authority")
                .contains("SCOPE_openid", "SCOPE_profile", "ROLE_MANAGER", "ROLE_DEVELOPER");
    }
}