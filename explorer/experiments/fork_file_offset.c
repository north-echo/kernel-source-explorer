/* Original unprivileged experiment using a tiny, unlinked regular file. */
/* @step headers */
#define _POSIX_C_SOURCE 200809L /* Ask headers to expose POSIX.1-2008 interfaces. */
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/wait.h>
#include <unistd.h>

int main(void) {
    /* @step setup */
    /* mkstemp replaces the Xs in this writable array and opens a new file. */
    char name[] = "/tmp/kse-offset-XXXXXX";
    int fd = mkstemp(name);
    if (fd == -1) {
        perror("mkstemp");
        return 1;
    }
    /* Remove the name immediately; the open reference keeps the file usable. */
    if (unlink(name) == -1) {
        perror("unlink");
        close(fd);
        return 1;
    }
    /* @step prepare */
    /* ssize_t represents a byte count OR -1. Check these cases separately. */
    ssize_t written = write(fd, "abcd", 4);
    if (written == -1) {
        perror("write");
        close(fd);
        return 1;
    }
    if (written != 4) {
        fputs("short preparation write; this finite demo expects four bytes\n", stderr);
        close(fd);
        return 1;
    }
    if (lseek(fd, 0, SEEK_SET) == -1) {
        perror("lseek");
        close(fd);
        return 1;
    }
    /* @step fork */
    pid_t child_pid = fork();
    if (child_pid == -1) {
        perror("fork");
        close(fd);
        return 1;
    }
    if (child_pid == 0) {
        char first[2];
        ssize_t count = read(fd, first, sizeof(first));
        if (count == -1) {
            perror("child read");
            _exit(1);
        }
        if (count != 2) {
            fputs("child expected two regular-file bytes\n", stderr);
            _exit(1);
        }
        close(fd);
        _exit(0);
    }
    /* @step wait */
    int status;
    while (waitpid(child_pid, &status, 0) == -1) {
        if (errno == EINTR) {
            continue;
        }
        perror("waitpid");
        close(fd);
        return 1;
    }
    if (!WIFEXITED(status) || WEXITSTATUS(status) != 0) {
        fputs("child did not read successfully\n", stderr);
        close(fd);
        return 1;
    }
    /* @step observe */
    char next;
    /* &next supplies the address of storage for one byte. */
    ssize_t count = read(fd, &next, 1);
    if (count == -1) {
        perror("parent read");
        close(fd);
        return 1;
    }
    if (count != 1) {
        fputs("parent expected one regular-file byte\n", stderr);
        close(fd);
        return 1;
    }
    printf("parent next byte=%c\n", next);
    /* Both processes release their descriptor; the unlinked file can disappear. */
    close(fd);
    return 0;
}
