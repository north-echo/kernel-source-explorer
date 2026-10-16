/* Original learning experiment: ordinary fork gives separate variable state. */
#include <errno.h>
#include <stdio.h>
#include <sys/wait.h>
#include <unistd.h>
int main(void) {
    int value = 42;
    pid_t child = fork();
    if (child == -1) { perror("fork"); return 1; }
    if (child == 0) {
        value = 7;
        printf("child value=%d\n", value);
        if (fflush(stdout) == EOF) _exit(1);
        _exit(0);
    }
    int status;
    while (waitpid(child, &status, 0) == -1) {
        if (errno == EINTR) continue;
        perror("waitpid"); return 1;
    }
    if (!WIFEXITED(status) || WEXITSTATUS(status) != 0) return 1;
    printf("parent value=%d\n", value);
    return 0;
}
