/* Original unprivileged experiment: examine the two results of waitpid. */
/* @step headers */
#include <errno.h>
#include <stdio.h>
#include <sys/wait.h>
#include <unistd.h>

int main(void) {
    /* @step fork */
    pid_t child_pid = fork();
    if (child_pid == -1) {
        perror("fork");
        return 1;
    }
    if (child_pid == 0) {
        /* This is the child's exit status, not the parent's status. */
        _exit(42);
    }

    /* @step wait */
    int status;
    pid_t waited;
    /* & passes the address of status; the return value is stored in waited. */
    do {
        waited = waitpid(child_pid, &status, 0);
    } while (waited == -1 && errno == EINTR);
    /* && evaluates its right side only when the left side is true. */
    if (waited == -1) {
        perror("waitpid");
        return 1;
    }

    /* @step decode */
    /* Decode only the variant the macros say is present. */
    if (!WIFEXITED(status)) {
        fputs("child did not exit normally\n", stderr);
        return 1;
    }
    /* ?: chooses one string. %s prints that string; %d prints an integer. */
    printf("waited for child=%s exit status=%d\n",
           waited == child_pid ? "yes" : "no", WEXITSTATUS(status));
    return 0;
}
