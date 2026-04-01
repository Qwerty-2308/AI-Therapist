# Dockerfile for Java Backend
FROM eclipse-temurin:21-jdk-alpine as builder

WORKDIR /app

RUN apk add --no-cache maven

COPY pom.xml .
COPY src ./src

RUN mvn dependency:go-offline -B
RUN mvn package -DskipTests

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=builder /app/target/serenova-backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java","-jar","app.jar"]