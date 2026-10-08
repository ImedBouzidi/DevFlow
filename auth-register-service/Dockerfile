# syntax=docker/dockerfile:1.7
FROM maven:3.9.9-eclipse-temurin-17-alpine AS build
WORKDIR /workspace
COPY . .
RUN --mount=type=cache,target=/root/.m2 \
  mvn -B -ntp -pl auth-register-service -am package -DskipTests

FROM eclipse-temurin:17-jre-alpine
RUN apk add --no-cache curl \
    && addgroup -S app \
    && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /workspace/auth-register-service/target/auth-register-service-*.jar /app/app.jar
USER app
EXPOSE 8082
HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=10 \
  CMD curl -fsS http://127.0.0.1:8082/actuator/health >/dev/null || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
