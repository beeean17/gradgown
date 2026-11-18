rootProject.name = "gradgown"

// db              the SQL that defines the database, and tests that run it on MySQL
// core            rules and response types shared by the two servers; no web, no database
// student-server  the API for the student web; connects as gradgown_student
include("db", "core", "student-server")
