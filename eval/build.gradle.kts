// Measurements for the report's evaluation (docs/decisions/evaluation.md). Not a test: there is
// no pass or fail. It loads the same synthetic data into MySQL and into a local Firestore
// emulator, runs the original service's queries on one and this project's SQL on the other, and
// writes what each had to read.
//
//   ./gradlew :eval:measure        (see eval/README.md; the emulator must be running)

import org.springframework.boot.gradle.plugin.SpringBootPlugin

plugins {
    java
}

dependencies {
    // The MySQL container that the tests use, initialised from db/init.
    implementation(testFixtures(project(":db")))
    // JSON for the emulator's REST API.
    implementation(platform(SpringBootPlugin.BOM_COORDINATES))
    implementation("tools.jackson.core:jackson-databind")
}

tasks.register<JavaExec>("measure") {
    group = "verification"
    description = "Runs the evaluation measurements and writes eval/results/*.md"
    mainClass = "gradgown.eval.Measure"
    classpath = sourceSets.main.get().runtimeClasspath
    systemProperty("gradgown.db.dir", rootProject.file("db").absolutePath)
    systemProperty("gradgown.eval.results", layout.projectDirectory.dir("results").asFile.absolutePath)
    systemProperty("user.timezone", "UTC")
    maxHeapSize = "2g"
}
