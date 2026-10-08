package com.devflow.incident.exception;

public class IncidentNotFoundException extends RuntimeException {
    public IncidentNotFoundException(String incidentId) {
        super("Incident not found: " + incidentId);
    }
}
