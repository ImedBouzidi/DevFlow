pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        DOCKER_BUILDKIT = '1'
        COMPOSE_FILE = 'infrastructure/docker-compose.yml'
        IMAGE_TAG = "build-${BUILD_NUMBER}"
        COMPOSE_PARALLEL_LIMIT = '1'
    }

    stages {
        stage('Backend tests') {
            steps {
                sh 'mvn -B -ntp clean verify'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: '**/target/surefire-reports/*.xml'
                }
            }
        }

        stage('Frontend build') {
            steps {
                sh(script: '''#!/bin/bash
                    set -o pipefail
                    docker run --rm \\
                      --user "$(id -u):$(id -g)" \\
                      --volume "$WORKSPACE/frontend:/workspace" \\
                      --workdir /workspace \\
                      --env HOME=/tmp \\
                      --env npm_config_cache=/tmp/npm-cache \\
                      node:22-alpine \\
                      sh -ec 'node --version; npm --version; npm ci --loglevel verbose; npm run build' \\
                      2>&1 | tee "$WORKSPACE/frontend-build.log"
                ''')
            }
            post {
                always {
                    archiveArtifacts allowEmptyArchive: true, artifacts: 'frontend-build.log'
                }
            }
        }

        stage('Python tests') {
            steps {
                sh '''
                    mkdir -p "$WORKSPACE/.cache/pip-ai" "$WORKSPACE/.jenkins-test-results/$BUILD_NUMBER"
                    docker run --rm \
                      --user "$(id -u):$(id -g)" \
                      --volume "$WORKSPACE/ai-analysis-server:/workspace" \
                      --volume "$WORKSPACE/.jenkins-test-results/$BUILD_NUMBER:/reports" \
                      --volume "$WORKSPACE/.cache/pip-ai:/pip-cache" \
                      --workdir /workspace \
                      --env PIP_CACHE_DIR=/pip-cache \
                      --env PIP_DEFAULT_TIMEOUT=120 \
                      --env PIP_RETRIES=10 \
                      --env HOME=/tmp \
                      python:3.11-slim \
                      sh -ec 'python -m venv /tmp/venv && /tmp/venv/bin/python -m pip install -r requirements-dev.txt && /tmp/venv/bin/python -m pytest -q --junitxml=/reports/pytest.xml'
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: '.jenkins-test-results/*/pytest.xml'
                }
            }
        }

        stage('Compose validation') {
            steps {
                sh 'docker compose config --quiet'
            }
        }

        stage('Build container images') {
            steps {
                sh 'docker compose build --pull --progress plain'
            }
        }
    }

}
