// Code the two servers share: domain rules, input validation, response types.
// It depends on nothing but the JDK, so the rules can be tested without a web
// framework or a database (docs/testing/static.md).

plugins {
    `java-library`
    `java-test-fixtures`
}

dependencies {
    testImplementation(platform("org.junit:junit-bom:6.1.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
