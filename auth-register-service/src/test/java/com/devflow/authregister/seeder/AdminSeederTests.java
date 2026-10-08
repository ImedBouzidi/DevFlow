package com.devflow.authregister.seeder;

import com.devflow.authregister.auth.KeycloakAdminClient;
import com.devflow.authregister.config.KeycloakProperties;
import com.devflow.authregister.exceptions.RegistrationConflictException;
import com.devflow.authregister.user.AppUser;
import com.devflow.authregister.user.AppUserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminSeederTests {

    @Mock
    private KeycloakAdminClient keycloakAdminClient;

    @Mock
    private AppUserRepository userRepository;

    @Test
    void persistsLocallyWhenKeycloakAlreadyHasSeededAdmin() {
        KeycloakProperties properties = new KeycloakProperties(
                "http://localhost:9091",
                "devflow",
                "devflow-auth-service",
                "test-secret",
                "ROLE_SUPPORT",
                "admin",
                "admin@devflow.local",
                "Devflow123!",
                "ROLE_ADMIN");
        AdminSeeder seeder = new AdminSeeder(keycloakAdminClient, userRepository, properties);

        when(userRepository.findByUsernameIgnoreCase("admin")).thenReturn(Optional.empty());
        when(keycloakAdminClient.createUser("admin", "admin@devflow.local", "Admin", "User", "Devflow123!"))
                .thenThrow(new RegistrationConflictException("already exists"));
        when(keycloakAdminClient.findUserIdByUsername("admin")).thenReturn("existing-keycloak-id");
        when(userRepository.saveAndFlush(any(AppUser.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        seeder.run();

        verify(keycloakAdminClient).assignRole("existing-keycloak-id", "ROLE_ADMIN");
        verify(keycloakAdminClient).findUserIdByUsername("admin");
        verify(keycloakAdminClient, never()).deleteUser(any());
        org.mockito.ArgumentCaptor<AppUser> userCaptor = org.mockito.ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository).saveAndFlush(userCaptor.capture());
        assertThat(userCaptor.getValue().getKeycloakUserId()).isEqualTo("existing-keycloak-id");
        assertThat(userCaptor.getValue().getUsername()).isEqualTo("admin");
        assertThat(userCaptor.getValue().getEmail()).isEqualTo("admin@devflow.local");
        assertThat(userCaptor.getValue().getRole().name()).isEqualTo("ROLE_ADMIN");
    }
}
