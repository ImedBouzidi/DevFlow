package com.devflow.authregister.auth;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import com.devflow.authregister.config.KeycloakProperties;
import com.devflow.authregister.dto.AdminCreateUserRequest;
import com.devflow.authregister.dto.ChangePasswordRequest;
import com.devflow.authregister.dto.CurrentUserResponse;
import com.devflow.authregister.dto.RegisterRequest;
import com.devflow.authregister.dto.RegisteredUserResponse;
import com.devflow.authregister.dto.UpdateCurrentUserRequest;
import com.devflow.authregister.exceptions.RegistrationConflictException;
import com.devflow.authregister.service.RegistrationService;
import com.devflow.authregister.user.AppUser;
import com.devflow.authregister.user.AppUserRepository;
import com.devflow.authregister.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.ArgumentCaptor;

@ExtendWith(MockitoExtension.class)
class RegistrationServiceTests {

        @Mock
        private AppUserRepository userRepository;

        @Mock
        private KeycloakAdminClient keycloakAdminClient;

        private RegistrationService registrationService;

        private final RegisterRequest request = new RegisterRequest(
                        "New.Support",
                        "new.support@devflow.local",
                        "StrongPassword1!",
                        "New",
                        "Support");

        @BeforeEach
        void setUp() {
                KeycloakProperties properties = new KeycloakProperties(
                                "http://localhost:8081",
                                "devflow",
                                "devflow-auth-service",
                                "test-secret",
                                "ROLE_SUPPORT",
                                "",
                                "",
                                "",
                                "ROLE_ADMIN");
                registrationService = new RegistrationService(userRepository, keycloakAdminClient, properties);
        }

        @Test
        void registersKeycloakAndLocalSupportUser() {
                when(userRepository.findByUsernameIgnoreCase("new.support")).thenReturn(Optional.empty());
                when(userRepository.findByEmailIgnoreCase("new.support@devflow.local")).thenReturn(Optional.empty());
                when(userRepository.saveAndFlush(any(AppUser.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));
                when(keycloakAdminClient.createUser(
                                eq("new.support"),
                                eq("new.support@devflow.local"),
                                eq("New"),
                                eq("Support"),
                                eq("StrongPassword1!")))
                                .thenReturn("keycloak-user-1");

                RegisteredUserResponse response = registrationService.register(request);

                assertThat(response.username()).isEqualTo("new.support");
                assertThat(response.email()).isEqualTo("new.support@devflow.local");
                assertThat(response.role()).isEqualTo("ROLE_SUPPORT");
                assertThat(response.enabled()).isTrue();
                verify(keycloakAdminClient).createUser(
                                eq("new.support"),
                                eq("new.support@devflow.local"),
                                eq("New"),
                                eq("Support"),
                                eq("StrongPassword1!"));
                verify(keycloakAdminClient).assignDefaultRole("keycloak-user-1");
        }

        @Test
        void createsAdminUserInKeycloakAndLocalDatabase() {
                Set<UserRole> roles = Set.of(UserRole.ROLE_DEVELOPER, UserRole.ROLE_MANAGER);
                AdminCreateUserRequest createRequest = new AdminCreateUserRequest(
                                "New.Manager",
                                "new.manager@devflow.local",
                                "StrongPassword1!",
                                "New",
                                "Manager",
                                roles);
                when(userRepository.findByUsernameIgnoreCase("new.manager")).thenReturn(Optional.empty());
                when(userRepository.findByEmailIgnoreCase("new.manager@devflow.local")).thenReturn(Optional.empty());
                when(userRepository.saveAndFlush(any(AppUser.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));
                when(keycloakAdminClient.createUser(
                                eq("new.manager"),
                                eq("new.manager@devflow.local"),
                                eq("New"),
                                eq("Manager"),
                                eq("StrongPassword1!")))
                                .thenReturn("keycloak-admin-user-1");

                RegisteredUserResponse response = registrationService.createUser(createRequest);

                assertThat(response.username()).isEqualTo("new.manager");
                assertThat(response.email()).isEqualTo("new.manager@devflow.local");
                verify(keycloakAdminClient).setRoles(
                                eq("keycloak-admin-user-1"),
                                eq(Set.of("ROLE_DEVELOPER", "ROLE_MANAGER")));
                ArgumentCaptor<AppUser> persistedUser = ArgumentCaptor.forClass(AppUser.class);
                verify(userRepository).saveAndFlush(persistedUser.capture());
                assertThat(persistedUser.getValue().getKeycloakUserId()).isEqualTo("keycloak-admin-user-1");
                assertThat(persistedUser.getValue().getUsername()).isEqualTo("new.manager");
                assertThat(persistedUser.getValue().getRoles()).containsExactlyInAnyOrderElementsOf(roles);
        }

        @Test
        void updatesOnlyTheAuthenticatedUsersProfile() {
                AppUser user = AppUser.create(
                                "keycloak-user-profile", "new.support", "new.support@devflow.local", "New", "Support",
                                UserRole.ROLE_SUPPORT);
                when(userRepository.findByKeycloakUserId("keycloak-user-profile")).thenReturn(Optional.of(user));
                when(userRepository.findByEmailIgnoreCase("updated.support@devflow.local"))
                                .thenReturn(Optional.empty());
                when(userRepository.saveAndFlush(user)).thenReturn(user);
                Jwt jwt = Jwt.withTokenValue("token")
                                .header("alg", "none")
                                .subject("keycloak-user-profile")
                                .issuedAt(Instant.now())
                                .expiresAt(Instant.now().plusSeconds(300))
                                .claim("preferred_username", "new.support")
                                .build();

                CurrentUserResponse response = registrationService.updateCurrentUser(
                                jwt,
                                new UpdateCurrentUserRequest(
                                                "updated.support@devflow.local", "Updated", "Support"));

                assertThat(response.email()).isEqualTo("updated.support@devflow.local");
                assertThat(response.firstName()).isEqualTo("Updated");
                verify(keycloakAdminClient).updateUser(
                                "keycloak-user-profile", "new.support", "updated.support@devflow.local",
                                "Updated", "Support", true, false);
        }

        @Test
        void verifiesCurrentPasswordBeforeChangingIt() {
                AppUser user = AppUser.create(
                                "keycloak-user-password", "new.support", "new.support@devflow.local", "New", "Support",
                                UserRole.ROLE_SUPPORT);
                when(userRepository.findByKeycloakUserId("keycloak-user-password")).thenReturn(Optional.of(user));
                Jwt jwt = Jwt.withTokenValue("token")
                                .header("alg", "none")
                                .subject("keycloak-user-password")
                                .issuedAt(Instant.now())
                                .expiresAt(Instant.now().plusSeconds(300))
                                .claim("preferred_username", "new.support")
                                .build();

                registrationService.changeCurrentPassword(
                                jwt, new ChangePasswordRequest("CurrentPassword1!", "NewPassword2!"));

                verify(keycloakAdminClient).verifyPassword("new.support", "CurrentPassword1!");
                verify(keycloakAdminClient).updatePassword("keycloak-user-password", "NewPassword2!");
        }

        @Test
        void rollsBackKeycloakWhenLocalPersistenceFails() {
                when(userRepository.findByUsernameIgnoreCase("new.support")).thenReturn(Optional.empty());
                when(userRepository.findByEmailIgnoreCase("new.support@devflow.local")).thenReturn(Optional.empty());
                when(userRepository.saveAndFlush(any(AppUser.class)))
                                .thenThrow(new DataIntegrityViolationException("duplicate"));
                when(keycloakAdminClient.createUser(
                                eq("new.support"),
                                eq("new.support@devflow.local"),
                                eq("New"),
                                eq("Support"),
                                eq("StrongPassword1!")))
                                .thenReturn("keycloak-user-2");

                assertThatThrownBy(() -> registrationService.register(request))
                                .isInstanceOf(RegistrationConflictException.class)
                                .hasMessageContaining("already exists");

                verify(keycloakAdminClient).deleteUser(any());
        }

        @Test
        void returnsAReadOnlyProfileForAProvisionedKeycloakUser() {
                when(userRepository.findByKeycloakUserId("keycloak-subject")).thenReturn(Optional.empty());
                when(userRepository.findByUsernameIgnoreCase("manager")).thenReturn(Optional.empty());

                Jwt jwt = Jwt.withTokenValue("token")
                                .header("alg", "none")
                                .subject("keycloak-subject")
                                .issuedAt(Instant.now())
                                .expiresAt(Instant.now().plusSeconds(300))
                                .claim("preferred_username", "manager")
                                .claim("name", "Maya Patel")
                                .claim("email", "manager@devflow.local")
                                .claim("realm_access", Map.of("roles", List.of("ROLE_MANAGER", "offline_access")))
                                .build();

                CurrentUserResponse response = registrationService.currentUser(jwt);

                assertThat(response.username()).isEqualTo("manager");
                assertThat(response.firstName()).isEqualTo("Maya");
                assertThat(response.lastName()).isEqualTo("Patel");
                assertThat(response.role()).isEqualTo("ROLE_MANAGER");
                assertThat(response.enabled()).isTrue();
        }

        @Test
        void doesNotDeleteAnIdentityThatWasNeverCreated() {
                when(userRepository.findByUsernameIgnoreCase("new.support")).thenReturn(Optional.empty());
                when(userRepository.findByEmailIgnoreCase("new.support@devflow.local")).thenReturn(Optional.empty());
                when(keycloakAdminClient.createUser(
                                eq("new.support"),
                                eq("new.support@devflow.local"),
                                eq("New"),
                                eq("Support"),
                                eq("StrongPassword1!")))
                                .thenThrow(new RegistrationConflictException("duplicate identity"));

                assertThatThrownBy(() -> registrationService.register(request))
                                .isInstanceOf(RegistrationConflictException.class);

                verify(keycloakAdminClient, never()).assignDefaultRole(any());
                verify(keycloakAdminClient, never()).deleteUser(any());
        }
}
