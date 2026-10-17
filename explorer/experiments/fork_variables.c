/* Original Lab 001. Type this file a segment at a time in a normal Linux shell. */
/* @step headers */
/* Headers declare functions and types; they do not execute those functions. */
#include <errno.h>      /* errno and the EINTR interruption code */
#include <stdio.h>      /* printf, fflush, perror, stdout */
#include <sys/wait.h>   /* waitpid and status-decoding macros */
#include <unistd.h>     /* fork, _exit, and pid_t */

int main(void) {
    /* int declares an integer. The initializer gives this instance a value. */
    int value = 42;

    /* @step fork */
    /* pid_t is the implementation's process-ID type, not a function. */
    /* fork() is called once here; inspect its returned value in each process. */
    pid_t child_pid = fork();

    /* -1 means no child was created. perror interprets errno after that failure. */
    if (child_pid == -1) {
        perror("fork");
        return 1;
    }

    /* @step child */
    /* == compares values. A zero return selects the child's branch. */
    if (child_pid == 0) {
        value = 7;
        /* %d formats an int; \n ends the printed line. */
        printf("child value=%d\n", value);
        /* Flush the library buffer before _exit bypasses stdio cleanup. */
        if (fflush(stdout) == EOF) {
            _exit(1);
        }
        _exit(0);
    }

    /* @step wait */
    /* The parent received a positive child PID. &status means its address: */
    /* waitpid writes an encoded result into that integer through a pointer. */
    int status;
    while (waitpid(child_pid, &status, 0) == -1) {
        /* An interrupted wait is retried; other errors need a diagnostic. */
        if (errno == EINTR) {
            continue;
        }
        perror("waitpid");
        return 1;
    }
    /* || is short-circuit OR: inspect an exit code only after normal exit. */
    if (!WIFEXITED(status) || WEXITSTATUS(status) != 0) {
        fputs("child did not complete normally\n", stderr);
        return 1;
    }

    /* @step finish */
    /* Now inspect the parent's variable. Returning 0 reports normal success. */
    printf("parent value=%d\n", value);
    return 0;
}
