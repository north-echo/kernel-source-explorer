/* Original learning experiment: replace this program image, retaining its PID. */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
static int value = 7;
int main(int argc, char **argv) {
    if (argc == 2 && strcmp(argv[1], "after") == 0) {
        printf("after exec pid=%ld value=%d\n", (long)getpid(), value);
        return 0;
    }
    value = 42;
    printf("before exec pid=%ld value=%d\n", (long)getpid(), value);
    if (fflush(stdout) == EOF) return 1;
    execl(argv[0], argv[0], "after", (char *)NULL);
    perror("execl"); /* Reached only if replacement failed. */
    return 1;
}
