plugins {
    java
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation(platform("org.junit:junit-bom:6.1.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")

    testImplementation(platform("org.testcontainers:testcontainers-bom:2.0.5"))
    testImplementation("org.testcontainers:testcontainers-mysql")

    testRuntimeOnly("com.mysql:mysql-connector-j:26.10.0")
    testRuntimeOnly("org.slf4j:slf4j-simple:2.0.17")
}

tasks.withType<JavaCompile>().configureEach {
    options.encoding = "UTF-8"
    // Compiler warnings fail the build (docs/testing/static.md).
    options.compilerArgs.addAll(listOf("-Xlint:all", "-Werror"))
}

tasks.test {
    useJUnitPlatform()

    // The tests read the SQL and the server settings from these directories,
    // so a change there must run the tests again.
    inputs.dir("init")
    inputs.dir("conf")
    inputs.file(rootProject.file("compose.yaml"))
    systemProperty("gradgown.db.dir", projectDir.absolutePath)
    systemProperty("gradgown.compose.file", rootProject.file("compose.yaml").absolutePath)

    testLogging {
        events("passed", "failed", "skipped")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
    }
}
