/* Original unprivileged experiment. Uses only a temporary file containing demo text. */
#define _POSIX_C_SOURCE 200809L
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <unistd.h>
int main(int argc, char **argv) {
    if (argc == 3 && strcmp(argv[1], "--helper") == 0) {
        int fd = atoi(argv[2]);
        char data[32] = {0};
        ssize_t n = read(fd, data, sizeof(data) - 1);
        if (n == -1 && errno == EBADF) {
            puts("helper inherited descriptor=no");
            return 0;
        }
        if (n < 0) { perror("helper read"); return 1; }
        printf("helper inherited descriptor=yes data=%s\n", data);
        return strcmp(data, "demo only") != 0;
    }
    if (argc > 2 || (argc == 2 && strcmp(argv[1], "--cloexec") && strcmp(argv[1], "--close-child"))) {
        fprintf(stderr, "usage: %s [--cloexec|--close-child]\n", argv[0]);
        return 1;
    }
    char name[] = "/tmp/kse-authority-XXXXXX";
    int fd = mkstemp(name);
    if (fd == -1) { perror("mkstemp"); return 1; }
    if (unlink(name) == -1) { perror("unlink"); close(fd); return 1; }
    if (write(fd, "demo only", 9) != 9 || lseek(fd, 0, SEEK_SET) == -1) {
        perror("prepare file"); close(fd); return 1;
    }
    if (argc == 2 && strcmp(argv[1], "--cloexec") == 0 && fcntl(fd, F_SETFD, FD_CLOEXEC) == -1) {
        perror("fcntl"); close(fd); return 1;
    }
    pid_t child = fork();
    if (child == -1) { perror("fork"); close(fd); return 1; }
    if (child == 0) {
        if (argc == 2 && strcmp(argv[1], "--close-child") == 0) close(fd);
        char descriptor[32];
        snprintf(descriptor, sizeof(descriptor), "%d", fd);
        execl(argv[0], argv[0], "--helper", descriptor, (char *)NULL);
        perror("execl"); _exit(1);
    }
    int status;
    while (waitpid(child, &status, 0) == -1) {
        if (errno == EINTR) continue;
        perror("waitpid"); close(fd); return 1;
    }
    printf("parent descriptor still open=%s\n", fcntl(fd, F_GETFD) == -1 ? "no" : "yes");
    close(fd);
    return !WIFEXITED(status) || WEXITSTATUS(status) != 0;
}
