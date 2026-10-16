/* Original learning experiment: a parent obtains its child's exit status. */
#include <errno.h>
#include <stdio.h>
#include <sys/wait.h>
#include <unistd.h>
int main(void) {
    pid_t child = fork();
    if (child == -1) { perror("fork"); return 1; }
    if (child == 0) _exit(42);
    int status;
    pid_t waited;
    do { waited = waitpid(child, &status, 0); } while (waited == -1 && errno == EINTR);
    if (waited == -1) { perror("waitpid"); return 1; }
    if (!WIFEXITED(status)) { fputs("child did not exit normally\n", stderr); return 1; }
    printf("waited for child=%s exit status=%d\n", waited == child ? "yes" : "no", WEXITSTATUS(status));
    return 0;
}
