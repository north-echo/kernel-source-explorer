/* Original demo: only the temporary file created below is used. */
/* @step headers */
#define _POSIX_C_SOURCE 200809L
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <unistd.h>

int main(int argc, char **argv) {
    /* @step helper */
    /* The new program image enters this branch using arguments supplied below. */
    if (argc == 3 && strcmp(argv[1], "--helper") == 0) {
        char *end;
        errno = 0;
        /* strtol supplies an end pointer and range diagnostics, unlike atoi. */
        long number = strtol(argv[2], &end, 10);
        if (errno != 0 || *argv[2] == '\0' || *end != '\0' || number < 0 || number > INT_MAX) {
            fputs("helper needs a nonnegative descriptor number\n", stderr);
            return 1;
        }
        int fd = (int)number; /* The checked range makes this conversion safe. */
        char data[32] = {0};  /* Zero-fill, leaving room for a terminating null. */
        ssize_t count = read(fd, data, sizeof(data) - 1);
        if (count == -1 && errno == EBADF) {
            puts("helper inherited descriptor=no");
            return 0;
        }
        if (count == -1) {
            perror("helper read");
            return 1;
        }
        if (count != 9) {
            fputs("helper expected nine bytes from the demo regular file\n", stderr);
            return 1;
        }
        printf("helper inherited descriptor=yes data=%s\n", data);
        return strcmp(data, "demo only") != 0;
    }
    /* @step setup */
    if (argc > 2 || (argc == 2 && strcmp(argv[1], "--cloexec") != 0 &&
                     strcmp(argv[1], "--close-child") != 0)) {
        fprintf(stderr, "usage: %s [--cloexec|--close-child]\n", argv[0]);
        return 1;
    }
    char name[] = "/tmp/kse-authority-XXXXXX";
    int fd = mkstemp(name);
    if (fd == -1) {
        perror("mkstemp");
        return 1;
    }
    if (unlink(name) == -1) {
        perror("unlink");
        close(fd);
        return 1;
    }
    ssize_t written = write(fd, "demo only", 9);
    if (written == -1) {
        perror("write");
        close(fd);
        return 1;
    }
    if (written != 9) {
        fputs("short demo-file write; expected nine bytes\n", stderr);
        close(fd);
        return 1;
    }
    if (lseek(fd, 0, SEEK_SET) == -1) {
        perror("lseek");
        close(fd);
        return 1;
    }
    /* @step flags */
    if (argc == 2 && strcmp(argv[1], "--cloexec") == 0) {
        /* Preserve any existing descriptor flags when adding FD_CLOEXEC. */
        int flags = fcntl(fd, F_GETFD);
        if (flags == -1 || fcntl(fd, F_SETFD, flags | FD_CLOEXEC) == -1) {
            perror("fcntl");
            close(fd);
            return 1;
        }
    }
    /* @step fork */
    pid_t child_pid = fork();
    if (child_pid == -1) {
        perror("fork");
        close(fd);
        return 1;
    }
    if (child_pid == 0) {
        if (argc == 2 && strcmp(argv[1], "--close-child") == 0) {
            if (close(fd) == -1) {
                perror("child close");
                _exit(1);
            }
        }
        /* @step exec */
        char descriptor[32];
        int length = snprintf(descriptor, sizeof(descriptor), "%d", fd);
        if (length < 0 || (size_t)length >= sizeof(descriptor)) {
            fputs("descriptor conversion did not fit\n", stderr);
            _exit(1);
        }
        /* Use ./inherited_authority so argv[0] is a path, not a PATH lookup. */
        /* The final (char *)NULL terminates the variable argument list. */
        execl(argv[0], argv[0], "--helper", descriptor, (char *)NULL);
        perror("execl");
        _exit(1);
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
    printf("parent descriptor still open=%s\n",
           fcntl(fd, F_GETFD) == -1 ? "no" : "yes");
    close(fd);
    /* Do not extract a normal exit code if termination was caused by a signal. */
    return !WIFEXITED(status) || WEXITSTATUS(status) != 0;
}
