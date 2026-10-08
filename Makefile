.PHONY: infra-up infra-build infra-down infra-logs discovery api-gateway auth-service frontend backend-test frontend-test verify

COMPOSE := docker compose -f infrastructure/docker-compose.yml

infra-up:
	$(COMPOSE) up --build -d

infra-build:
	$(COMPOSE) build

infra-down:
	$(COMPOSE) down

infra-logs:
	$(COMPOSE) logs -f

discovery:
	mvn -pl discovery-server spring-boot:run

api-gateway:
	mvn -pl api-gateway spring-boot:run

auth-service:
	mvn -pl auth-register-service spring-boot:run

frontend:
	cd frontend && npm start

backend-test:
	mvn clean verify

frontend-test:
	cd frontend && npm run build && npm test -- --watch=false --browsers=ChromeHeadless

verify: backend-test frontend-test
