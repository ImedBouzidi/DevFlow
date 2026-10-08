FROM maven:3.9.9-eclipse-temurin-17-alpine AS build
WORKDIR /workspace
COPY . .
RUN mvn -B -pl api-gateway -am package -DskipTests

FROM eclipse-temurin:17-jre-alpine
RUN apk add --no-cache curl \
    && addgroup -S app \
    && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /workspace/api-gateway/target/api-gateway-*.jar /app/app.jar
USER app
EXPOSE 9090
HEALTHCHECK --interval=15s --timeout=3s --start-period=45s --retries=8 \
  CMD curl -fsS http://127.0.0.1:9090/actuator/health >/dev/null || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
