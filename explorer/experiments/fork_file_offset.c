/* Original learning experiment: inherited descriptors share an open file offset. */
#define _POSIX_C_SOURCE 200809L
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/wait.h>
#include <unistd.h>
int main(void) {
    char name[] = "/tmp/kse-offset-XXXXXX";
    int fd = mkstemp(name);
    if (fd == -1) { perror("mkstemp"); return 1; }
    if (unlink(name) == -1) { perror("unlink"); close(fd); return 1; }
    if (write(fd, "abcd", 4) != 4 || lseek(fd, 0, SEEK_SET) == -1) {
        perror("prepare file"); close(fd); return 1;
    }
    pid_t child = fork();
    if (child == -1) { perror("fork"); close(fd); return 1; }
    if (child == 0) {
        char first[2];
        if (read(fd, first, sizeof(first)) != 2) _exit(1);
        close(fd);
        _exit(0);
    }
    int status;
    while (waitpid(child, &status, 0) == -1) {
        if (errno == EINTR) continue;
        perror("waitpid"); close(fd); return 1;
    }
    if (!WIFEXITED(status) || WEXITSTATUS(status) != 0) { close(fd); return 1; }
    char next;
    if (read(fd, &next, 1) != 1) { perror("read"); close(fd); return 1; }
    printf("parent next byte=%c\n", next);
    close(fd);
    return 0;
}
