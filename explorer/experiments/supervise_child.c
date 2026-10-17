/* Original finite supervisor: signals only the child this program creates. */
/* @step headers */
#define _POSIX_C_SOURCE 200809L
#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <sys/wait.h>
#include <unistd.h>

int main(void) {
    /* @step channel */
    /* A pipe is used only as a readiness handshake, not as a timer. */
    int ready[2];
    if (pipe(ready) == -1) {
        perror("pipe");
        return 1;
    }
    pid_t child_pid = fork();
    if (child_pid == -1) {
        perror("fork");
        close(ready[0]);
        close(ready[1]);
        return 1;
    }
    /* @step child */
    if (child_pid == 0) {
        /* Do not inherit an ignored/blocked termination signal from a launcher. */
        struct sigaction action = {0};
        action.sa_handler = SIG_DFL;
        sigemptyset(&action.sa_mask);
        sigset_t unblocked;
        sigemptyset(&unblocked);
        sigaddset(&unblocked, SIGTERM);
        sigaddset(&unblocked, SIGALRM);
        if (sigaction(SIGTERM, &action, NULL) == -1 ||
            sigaction(SIGALRM, &action, NULL) == -1 ||
            sigprocmask(SIG_UNBLOCK, &unblocked, NULL) == -1) {
            perror("child signal setup");
            _exit(1);
        }
        /* Finite backstop if the parent fails; not the readiness protocol. */
        alarm(5);
        close(ready[0]);
        char byte = 'R';
        ssize_t count;
        do {
            count = write(ready[1], &byte, 1);
        } while (count == -1 && errno == EINTR);
        if (count != 1) {
            if (count == -1) {
                perror("ready write");
            } else {
                fputs("short ready write\n", stderr);
            }
            _exit(1);
        }
        close(ready[1]);
        /* The default SIGTERM disposition terminates this single child. */
        for (;;) {
            pause();
        }
    }
    /* @step supervise */
    close(ready[1]);
    char byte;
    ssize_t count;
    do {
        count = read(ready[0], &byte, 1);
    } while (count == -1 && errno == EINTR);
    close(ready[0]);
    int ready_ok = count == 1 && byte == 'R';
    if (!ready_ok) {
        if (count == -1) {
            perror("ready read");
        } else {
            fputs("child did not send readiness\n", stderr);
        }
    }
    /* Even on handshake failure, clean up our own child rather than abandoning it. */
    if (kill(child_pid, SIGTERM) == -1 && errno != ESRCH) {
        perror("kill own child");
        return 1;
    }
    /* @step reap */
    int status;
    while (waitpid(child_pid, &status, 0) == -1) {
        if (errno == EINTR) {
            continue;
        }
        perror("waitpid");
        return 1;
    }
    if (!ready_ok || !WIFSIGNALED(status) || WTERMSIG(status) != SIGTERM) {
        fputs("child did not terminate by the expected signal\n", stderr);
        return 1;
    }
    puts("child ready=yes terminated=SIGTERM reaped=yes");
    return 0;
}
