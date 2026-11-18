// The API for the admin app. It holds two connection pools, one for the read-only admin account
// and one for the master account, and picks one for each request by the role of the signed-in
// user (docs/decisions/admin-server-split.md).

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
