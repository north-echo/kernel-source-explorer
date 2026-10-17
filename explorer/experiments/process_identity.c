/* Original unprivileged experiment. Process IDs vary on every execution. */
/* @step headers */
#include <stdio.h>      /* printf is declared here. */
#include <unistd.h>     /* getpid and getppid are declared here. */

/* @step identity */
int main(void) {
    /* A pid_t value is converted to long so it matches printf's %ld format. */
    /* Parentheses after a function name call it; (long) is a numeric cast. */
    long process_id = (long)getpid();
    long parent_id = (long)getppid();

    /* @step finish */
    /* The two %ld placeholders consume the two long arguments in this order. */
    if (printf("pid=%ld parent=%ld\n", process_id, parent_id) < 0) {
        perror("printf");
        return 1;
    }
    /* An ID identifies a process; printing it does not change its authority. */
    return 0;
}
