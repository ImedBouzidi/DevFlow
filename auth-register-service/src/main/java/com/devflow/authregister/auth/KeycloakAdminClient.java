package com.devflow.authregister.auth;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.devflow.authregister.config.KeycloakProperties;
import com.devflow.authregister.exceptions.IdentityProviderException;
import com.devflow.authregister.exceptions.RegistrationConflictException;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class KeycloakAdminClient {

    private final KeycloakProperties properties;
    private final RestClient restClient;
    private volatile CachedToken cachedToken;

    public KeycloakAdminClient(RestClient.Builder restClientBuilder, KeycloakProperties properties) {
        this.properties = properties;
        this.restClient = restClientBuilder.baseUrl(properties.adminBaseUrl()).build();
    }

    public String createUser(
            String username,
            String email,
            String firstName,
            String lastName,
            String password) {
        KeycloakCreateUserRequest request = new KeycloakCreateUserRequest(
                username,
                email,
                firstName,
                lastName,
                true,
                false,
                List.of(new KeycloakCredential("password", password, true)),
                List.of("UPDATE_PASSWORD"));

        try {
            ResponseEntity<Void> response = restClient.post()
                    .uri("/admin/realms/{realm}/users", properties.realm())
                    .headers(this::withBearerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();

            URI location = response.getHeaders().getLocation();
            if (location != null) {
                String path = location.getPath();
                int separator = path.lastIndexOf('/');
                if (separator >= 0 && separator < path.length() - 1) {
                    return path.substring(separator + 1);
                }
            }

            return findUserId(username);
        } catch (HttpClientErrorException exception) {
            if (exception.getStatusCode().value() == HttpStatus.CONFLICT.value()) {
                throw new RegistrationConflictException("An account with this username or email already exists");
            }
            throw new IdentityProviderException("Keycloak could not create the account", exception);
        } catch (RestClientResponseException exception) {
            throw new IdentityProviderException("Keycloak could not create the account", exception);
        }
    }

    private String findUserId(String username) {
        try {
            KeycloakUserSummary[] users = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/admin/realms/{realm}/users")
                            .queryParam("username", username)
                            .queryParam("exact", true)
                            .build(properties.realm()))
                    .headers(this::withBearerToken)
                    .retrieve()
                    .body(KeycloakUserSummary[].class);
            if (users == null || users.length != 1 || users[0].id() == null) {
                throw new IdentityProviderException("Keycloak created an account with an unexpected identity", null);
            }
            return users[0].id();
        } catch (RestClientResponseException exception) {
            throw new IdentityProviderException("Could not read the created Keycloak account", exception);
        }
    }

    public void assignDefaultRole(String keycloakUserId) {
        assignRole(keycloakUserId, properties.defaultRole());
    }

    public void assignRole(String keycloakUserId, String roleName) {
        try {
            KeycloakRole role = findRole(roleName);
            restClient.post()
                    .uri("/admin/realms/{realm}/users/{userId}/role-mappings/realm", properties.realm(), keycloakUserId)
                    .headers(this::withBearerToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(List.of(Map.of("id", role.id(), "name", role.name())))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException exception) {
            throw new IdentityProviderException("Keycloak could not assign role '" + roleName + "'", exception);
        }
    }

    private KeycloakRole findRole(String roleName) {
        try {
            KeycloakRole role = restClient.get()
                    .uri("/admin/realms/{realm}/roles/{roleName}", properties.realm(), roleName)
                    .headers(this::withBearerToken)
                    .retrieve()
                    .body(KeycloakRole.class);
            if (role == null || role.id() == null) {
                throw new IdentityProviderException("The configured Keycloak role does not exist", null);
            }
            return role;
        } catch (RestClientResponseException exception) {
            throw new IdentityProviderException("Could not resolve the configured Keycloak role", exception);
        }
    }

    public void deleteUser(String keycloakUserId) {
        try {
            restClient.delete()
                    .uri("/admin/realms/{realm}/users/{userId}", properties.realm(), keycloakUserId)
                    .headers(this::withBearerToken)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException exception) {
            throw new IdentityProviderException("Keycloak could not roll back account creation", exception);
        }
    }

    private void withBearerToken(HttpHeaders headers) {
        headers.setBearerAuth(accessToken());
    }

    private String accessToken() {
        CachedToken current = cachedToken;
        if (current != null && current.expiresAt().isAfter(Instant.now())) {
            return current.value();
        }

        synchronized (this) {
            current = cachedToken;
            if (current != null && current.expiresAt().isAfter(Instant.now())) {
                return current.value();
            }

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("grant_type", "client_credentials");
            form.add("client_id", properties.clientId());
            form.add("client_secret", properties.clientSecret());

            try {
                TokenResponse response = restClient.post()
                        .uri("/realms/{realm}/protocol/openid-connect/token", properties.realm())
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .body(form)
                        .retrieve()
                        .body(TokenResponse.class);

                if (response == null || response.accessToken() == null || response.expiresIn() == null) {
                    throw new IdentityProviderException("Keycloak returned an invalid access-token response", null);
                }

                Instant expiresAt = Instant.now().plusSeconds(response.expiresIn()).minusSeconds(30);
                cachedToken = new CachedToken(response.accessToken(), expiresAt);
                return cachedToken.value();
            } catch (RestClientResponseException exception) {
                throw new IdentityProviderException("Could not authenticate with Keycloak", exception);
            }
        }
    }

    private record CachedToken(String value, Instant expiresAt) {
    }

    private record KeycloakCredential(String type, String value, boolean temporary) {
    }

    private record KeycloakUserSummary(String id, String username) {
    }

    private record KeycloakRole(String id, String name) {
    }

    private record KeycloakCreateUserRequest(
            String username,
            String email,
            String firstName,
            String lastName,
            boolean enabled,
            boolean emailVerified,
            List<KeycloakCredential> credentials,
            List<String> requiredActions) {
    }

    private record TokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("expires_in") Long expiresIn) {
    }
}
