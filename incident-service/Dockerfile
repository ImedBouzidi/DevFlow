FROM maven:3.9.9-eclipse-temurin-17-alpine AS build
WORKDIR /workspace
COPY . .
RUN mvn -B -pl incident-service -am package -DskipTests

FROM eclipse-temurin:17-jre-alpine
RUN apk add --no-cache curl \
    && addgroup -S app \
    && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /workspace/incident-service/target/incident-service-*.jar /app/app.jar
USER app
EXPOSE 8083
HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=10 \
  CMD curl -fsS http://127.0.0.1:8083/actuator/health >/dev/null || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
