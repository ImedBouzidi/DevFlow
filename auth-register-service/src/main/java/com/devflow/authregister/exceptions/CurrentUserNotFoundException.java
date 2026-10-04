package com.devflow.authregister.exceptions;

public class CurrentUserNotFoundException extends RuntimeException {

    public CurrentUserNotFoundException(String message) {
        super(message);
    }
}
