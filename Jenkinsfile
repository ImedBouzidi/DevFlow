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
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('Python tests') {
            steps {
                dir('ai-analysis-server') {
                    sh 'python3 -m venv .venv-ci'
                    sh '.venv-ci/bin/pip install -r requirements-dev.txt'
                    sh 'mkdir -p test-results'
                    sh '.venv-ci/bin/python -m pytest -q --junitxml=test-results/pytest.xml'
                }
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

    post {
        always {
            sh 'rm -rf ai-analysis-server/.venv-ci'
        }
    }
}
