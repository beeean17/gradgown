// The API for the student web. Connects to MySQL as gradgown_student, an account that can read
// the schedule and write reservations and registrations, and nothing else
// (docs/decisions/admin-server-split.md, docs/decisions/db-privileges.md).

import org.springframework.boot.gradle.plugin.SpringBootPlugin

plugins {
    java
    id("org.springframework.boot")
}

dependencies {
    implementation(platform(SpringBootPlugin.BOM_COORDINATES))
    implementation(project(":core"))
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.springframework.boot:spring-boot-starter-jdbc")
    runtimeOnly("com.mysql:mysql-connector-j")

    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("com.jayway.jsonpath:json-path")
    testImplementation(testFixtures(project(":db")))
    testImplementation(testFixtures(project(":core")))
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
