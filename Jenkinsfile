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
                    docker run --rm \
                      --volume "$WORKSPACE/ai-analysis-server:/workspace" \
                      --workdir /workspace \
                      python:3.11-slim \
                      sh -ec 'python -m pip install --no-cache-dir -r requirements-dev.txt && mkdir -p test-results && python -m pytest -q --junitxml=test-results/pytest.xml'
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'ai-analysis-server/test-results/*.xml'
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
                sh 'docker compose build --pull'
            }
        }
    }

}
