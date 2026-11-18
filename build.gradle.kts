// Settings shared by every module. Each module's own build file adds its dependencies.

plugins {
    // Not applied here. The servers apply it, and it gives every module the
    // coordinates of the Spring Boot BOM.
    id("org.springframework.boot") version "4.1.2" apply false
}

subprojects {
    repositories {
        mavenCentral()
    }

    plugins.withType<JavaPlugin> {
        extensions.configure<JavaPluginExtension> {
            toolchain {
                languageVersion = JavaLanguageVersion.of(21)
            }
        }

        tasks.withType<JavaCompile>().configureEach {
            options.encoding = "UTF-8"
            // Compiler warnings fail the build (docs/testing/static.md).
            options.compilerArgs.addAll(listOf("-Xlint:all", "-Werror", "-parameters"))
        }

        tasks.withType<Test>().configureEach {
            useJUnitPlatform()

            // Tests that need MySQL start a container from db/conf and db/init
            // (MySqlTestDatabase), so a change there must run them again.
            inputs.dir(rootProject.file("db/init"))
            inputs.dir(rootProject.file("db/conf"))
            systemProperty("gradgown.db.dir", rootProject.file("db").absolutePath)

            // The tests run in UTC, like CI, whatever zone the developer's machine is in. A
            // time that depended on the JVM's zone would show up as a nine-hour shift.
            systemProperty("user.timezone", "UTC")

            testLogging {
                events("passed", "failed", "skipped")
                exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
            }
        }
    }
}
