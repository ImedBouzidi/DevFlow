package com.devflow.incident.service;

import com.devflow.incident.domain.Incident;
import com.devflow.incident.domain.IncidentCategory;
import com.devflow.incident.domain.IncidentEnvironment;
import com.devflow.incident.domain.IncidentOrigin;
import com.devflow.incident.domain.IncidentSeverity;
import com.devflow.incident.domain.IncidentStatus;
import com.devflow.incident.repository.IncidentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class IncidentServiceTests {

    @Test
    void assignsIncidentToDeveloperAndPersistsTheAssignment() {
        IncidentRepository repository = mock(IncidentRepository.class);
        Incident incident = Incident.builder()
                .incidentId("INC-000001")
                .title("Checkout latency")
                .status(IncidentStatus.OPEN)
                .severity(IncidentSeverity.MEDIUM)
                .category(IncidentCategory.PERFORMANCE)
                .service("checkout-api")
                .environment(IncidentEnvironment.PRODUCTION)
                .origin(IncidentOrigin.SUPPORT)
                .build();
        when(repository.findByIncidentId("INC-000001")).thenReturn(Optional.of(incident));
        when(repository.save(incident)).thenReturn(incident);
        IncidentService service = new IncidentService(repository);

        var response = service.assignDeveloper("INC-000001", "dev.one");

        assertThat(response.assignedDeveloper()).isEqualTo("dev.one");
        verify(repository).save(incident);
    }

    @Test
    void preventsDeveloperFromChangingAnIncidentAssignedToSomeoneElse() {
        IncidentRepository repository = mock(IncidentRepository.class);
        Incident incident = Incident.builder()
                .incidentId("INC-000002")
                .title("Checkout latency")
                .status(IncidentStatus.OPEN)
                .severity(IncidentSeverity.MEDIUM)
                .category(IncidentCategory.PERFORMANCE)
                .service("checkout-api")
                .environment(IncidentEnvironment.PRODUCTION)
                .origin(IncidentOrigin.SUPPORT)
                .assignedDeveloper("dev.one")
                .build();
        when(repository.findByIncidentId("INC-000002")).thenReturn(Optional.of(incident));
        IncidentService service = new IncidentService(repository);

        assertThatThrownBy(() -> service.markInProgressForDeveloper("INC-000002", "dev.two"))
                .isInstanceOf(AccessDeniedException.class);
        verify(repository, never()).save(incident);
    }
}