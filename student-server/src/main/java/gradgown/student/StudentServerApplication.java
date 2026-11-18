package gradgown.student;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** The student server: the API behind the student web. */
@SpringBootApplication
public class StudentServerApplication {

  public static void main(String[] args) {
    SpringApplication.run(StudentServerApplication.class, args);
  }
}
