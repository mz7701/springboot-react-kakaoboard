# 1️⃣ 빌드 스테이지
FROM gradle:8.8-jdk17 AS builder
WORKDIR /app

# Gradle 캐시를 활용하기 위해 gradle 관련 파일만 먼저 복사
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
RUN gradle clean build --no-daemon || return 0

# 전체 프로젝트 복사
COPY . .

# JAR 빌드
RUN gradle clean build -x test --no-daemon

# 2️⃣ 실행 스테이지
FROM eclipse-temurin:17-jdk-jammy
WORKDIR /app
COPY --from=builder /app/build/libs/kakaoboard-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]