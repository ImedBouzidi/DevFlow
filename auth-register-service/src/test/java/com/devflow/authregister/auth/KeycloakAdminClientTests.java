package com.devflow.authregister.auth;

import com.devflow.authregister.config.KeycloakProperties;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;

class KeycloakAdminClientTests {

    @Test
    void createsUsersWithPermanentPasswordAndNoRequiredActions() {
        RestClient.Builder restClientBuilder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restClientBuilder).build();
        KeycloakProperties properties = new KeycloakProperties(
                "http://localhost:9091", "devflow", "devflow-auth-service", "secret",
                "ROLE_SUPPORT", "admin", "admin@devflow.local", "seed-password", "ROLE_ADMIN");
        KeycloakAdminClient client = new KeycloakAdminClient(restClientBuilder, properties, "devflow-web");

        server.expect(requestTo("http://localhost:9091/realms/devflow/protocol/openid-connect/token"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(
                        "{\"access_token\":\"test-token\",\"expires_in\":300}",
                        MediaType.APPLICATION_JSON));
        server.expect(requestTo("http://localhost:9091/admin/realms/devflow/users"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.credentials[0].temporary").value(false))
                .andExpect(jsonPath("$.requiredActions").isArray())
                .andExpect(jsonPath("$.requiredActions.length()").value(0))
                                .andRespond(withStatus(HttpStatus.CREATED)
                                                .headers(locationHeaders())
                                                .body(""));

        assertThat(client.createUser("new.user", "new.user@example.com", "New", "User", "StrongPassword1!"))
                .isEqualTo("user-123");
        server.verify();
    }

        private HttpHeaders locationHeaders() {
                HttpHeaders headers = new HttpHeaders();
                headers.setLocation(java.net.URI.create("http://localhost:9091/admin/realms/devflow/users/user-123"));
                return headers;
        }
}
