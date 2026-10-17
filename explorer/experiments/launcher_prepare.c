/* Original finite launch demo: all accessed paths belong to this program. */
/* @step headers */
#define _XOPEN_SOURCE 700
#include <errno.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <unistd.h>

int main(int argc, char **argv) {
    /* @step worker */
    /* Check the count before using argv[1] through argv[4]. */
    if (argc == 5 && strcmp(argv[1], "--worker") == 0) {
        const char *role = getenv("DEMO_ROLE");
        /* A deliberately inherited sentinel must be absent after explicit execve. */
        if (role == NULL || strcmp(role, "worker") != 0 ||
            getenv("KSE_OMITTED_SENTINEL") != NULL || strcmp(argv[2], "hello") != 0) {
            fputs("worker launch inputs disagree\n", stderr);
            return 1;
        }
        char actual[PATH_MAX];
        struct stat observed, intended;
        /* Measure the worker's cwd, then compare directory object identities. */
        if (getcwd(actual, sizeof(actual)) == NULL ||
            stat(actual, &observed) == -1 || stat(argv[3], &intended) == -1) {
            perror("worker cwd observation");
            return 1;
        }
        if (observed.st_dev != intended.st_dev || observed.st_ino != intended.st_ino) {
            fputs("worker cwd disagrees with intended directory\n", stderr);
            return 1;
        }
        /* This owned file is outside the cwd: chdir does not prevent its access. */
        FILE *outside = fopen(argv[4], "r");
        if (outside == NULL) {
            perror("worker owned outside file");
            return 1;
        }
        char contents[5] = {0};
        size_t count = fread(contents, 1, 4, outside);
        int close_result = fclose(outside);
        if (count != 4 || strcmp(contents, "demo") != 0 || close_result == EOF) {
            fputs("worker outside demo read failed\n", stderr);
            return 1;
        }
        puts("prepared argument=hello env=worker omitted sentinel=absent");
        puts("worker cwd matches intended=yes outside demo readable=yes");
        return 0;
    }
    /* @step setup */
    /* Run as ./launcher_prepare: resolve the executable before changing cwd. */
    char *executable = realpath(argv[0], NULL);
    if (executable == NULL) {
        perror("realpath; run as ./launcher_prepare");
        return 1;
    }
    char directory[] = "/tmp/kse-launch-XXXXXX";
    if (mkdtemp(directory) == NULL) {
        perror("mkdtemp");
        free(executable);
        return 1;
    }
    /* The template is short enough for these fixed suffixes and PATH_MAX arrays. */
    char working[PATH_MAX], outside_path[PATH_MAX], original[PATH_MAX];
    snprintf(working, sizeof(working), "%s/work", directory);
    snprintf(outside_path, sizeof(outside_path), "%s/outside", directory);
    int prepared = mkdir(working, 0700) == 0;
    FILE *outside = prepared ? fopen(outside_path, "w") : NULL;
    if (outside == NULL) {
        perror("prepare owned demo paths");
        prepared = 0;
    } else {
        int wrote = fputs("demo", outside);
        int closed = fclose(outside);
        prepared = wrote != EOF && closed != EOF;
    }
    /* Set only this process's harmless sentinel, never print the private environment. */
    if (!prepared || getcwd(original, sizeof(original)) == NULL ||
        setenv("KSE_OMITTED_SENTINEL", "parent-only", 1) == -1) {
        fputs("could not prepare launch\n", stderr);
        unlink(outside_path);
        rmdir(working);
        rmdir(directory);
        free(executable);
        return 1;
    }
    /* @step fork */
    pid_t child_pid = fork();
    if (child_pid == 0) {
        if (chdir(working) == -1) {
            perror("child chdir");
            _exit(1);
        }
        /* @step exec */
        /* Arrays contain string pointers; NULL ends each array, not a string. */
        char *arguments[] = {executable, "--worker", "hello", working, outside_path, NULL};
        char *environment[] = {"DEMO_ROLE=worker", "PATH=/usr/bin:/bin", NULL};
        execve(executable, arguments, environment);
        perror("execve");
        _exit(1);
    }
    /* @step cleanup */
    int child_ok = 0;
    if (child_pid == -1) {
        perror("fork");
    } else {
        int status;
        pid_t waited;
        do {
            waited = waitpid(child_pid, &status, 0);
        } while (waited == -1 && errno == EINTR);
        if (waited == -1) {
            perror("waitpid");
        } else {
            child_ok = WIFEXITED(status) && WEXITSTATUS(status) == 0;
        }
    }
    char current[PATH_MAX];
    int cwd_ok = getcwd(current, sizeof(current)) != NULL && strcmp(original, current) == 0;
    printf("parent cwd unchanged=%s\n", cwd_ok ? "yes" : "no");
    /* Attempt every cleanup operation, even if an earlier one fails. */
    int file_removed = unlink(outside_path);
    int work_removed = rmdir(working);
    int directory_removed = rmdir(directory);
    free(executable);
    if (file_removed == -1 || work_removed == -1 || directory_removed == -1) {
        fprintf(stderr, "demo cleanup failed; inspect only this owned demo tree: %s\n", directory);
        return 1;
    }
    return !child_ok || !cwd_ok;
}
