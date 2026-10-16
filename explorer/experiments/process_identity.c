/* Original learning experiment: relate a process ID to its parent. */
#include <stdio.h>
#include <unistd.h>
int main(void) {
    printf("pid=%ld parent=%ld\n", (long)getpid(), (long)getppid());
    return 0;
}
