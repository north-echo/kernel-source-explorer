/* Original unprivileged self-exec experiment. Run as ./exec_identity. */
/* @step headers */
#include <stdio.h>
#include <string.h>     /* strcmp compares C strings; 0 means equal. */
#include <unistd.h>

/* A static initializer runs as part of establishing a new program image. */
static int value = 7;

int main(int argc, char **argv) {
    /* @step arguments */
    /* argc counts arguments; argv points to an array of pointers to strings. */
    /* Check the count before indexing argv[1]. && short-circuits left to right. */
    if (argc == 2 && strcmp(argv[1], "after") == 0) {
        printf("after exec pid=%ld value=%d\n", (long)getpid(), value);
        return 0;
    }

    /* @step prepare */
    value = 42;
    printf("before exec pid=%ld value=%d\n", (long)getpid(), value);
    /* exec does not flush stdio. Flush now so this message is not discarded. */
    if (fflush(stdout) == EOF) {
        perror("fflush");
        return 1;
    }

    /* @step exec */
    /* argv[0] must name a usable executable path: use the documented ./ command. */
    /* execl takes separate string arguments. (char *)NULL is the terminating */
    /* null pointer, cast to the pointer type expected by this variadic call. */
    execl(argv[0], argv[0], "after", (char *)NULL);

    /* @step failure */
    /* Successful exec never reaches here. Failure preserves the old program. */
    perror("execl");
    return 1;
}
