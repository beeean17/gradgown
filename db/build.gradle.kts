// The SQL that defines the database (init/, conf/) and the tests that run it
// against a real MySQL. The test fixtures (MySqlTestDatabase) are shared with
// the servers' tests.

plugins {
    java
    `java-test-fixtures`
}

dependencies {
    testFixturesApi(platform("org.testcontainers:testcontainers-bom:2.0.5"))
    testFixturesImplementation("org.testcontainers:testcontainers-mysql")
    testFixturesRuntimeOnly("com.mysql:mysql-connector-j:26.10.0")
    testFixturesRuntimeOnly("org.slf4j:slf4j-simple:2.0.17")

    testImplementation(platform("org.junit:junit-bom:6.1.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    inputs.file(rootProject.file("compose.yaml"))
    systemProperty("gradgown.compose.file", rootProject.file("compose.yaml").absolutePath)
}
