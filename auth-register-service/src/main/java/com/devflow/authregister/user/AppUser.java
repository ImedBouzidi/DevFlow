package com.devflow.authregister.user;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.EntityListeners;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.JoinColumn;

@Entity
@Table(name = "app_users")
@EntityListeners(AuditingEntityListener.class)
public class AppUser {

    @Id
    private UUID id;

    @Column(name = "keycloak_user_id", nullable = false, unique = true, length = 36)
    private String keycloakUserId;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private UserRole role;

    @ElementCollection
    @CollectionTable(name = "app_user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 32)
    private Set<UserRole> roles = new LinkedHashSet<>();

    @Column(nullable = false)
    private boolean enabled;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AppUser() {
    }

    private AppUser(
            UUID id,
            String keycloakUserId,
            String username,
            String email,
            String firstName,
            String lastName,
            UserRole role,
            boolean enabled) {
        this.id = id;
        this.keycloakUserId = keycloakUserId;
        this.username = username;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.role = role;
        this.roles.add(role);
        this.enabled = enabled;
    }

    public static AppUser create(
            String keycloakUserId,
            String username,
            String email,
            String firstName,
            String lastName,
            UserRole role) {
        return new AppUser(
                UUID.randomUUID(),
                keycloakUserId,
                username,
                email,
                firstName,
                lastName,
                role,
                true);
    }

    public static AppUser create(
            String keycloakUserId,
            String username,
            String email,
            String firstName,
            String lastName,
            Set<UserRole> roles) {
        UserRole primaryRole = roles.stream().sorted().findFirst().orElseThrow();
        AppUser user = create(keycloakUserId, username, email, firstName, lastName, primaryRole);
        user.roles.clear();
        user.roles.addAll(roles);
        return user;
    }

    public UUID getId() {
        return id;
    }

    public String getKeycloakUserId() {
        return keycloakUserId;
    }

    public String getUsername() {
        return username;
    }

    public String getEmail() {
        return email;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public UserRole getRole() {
        return role;
    }

    public Set<UserRole> getRoles() {
        return Set.copyOf(roles);
    }

    public void updateProfile(String email, String firstName, String lastName, Set<UserRole> roles, boolean enabled) {
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.roles.clear();
        this.roles.addAll(roles);
        this.role = roles.iterator().next();
        this.enabled = enabled;
    }

    public void updateContactInfo(String email, String firstName, String lastName) {
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
