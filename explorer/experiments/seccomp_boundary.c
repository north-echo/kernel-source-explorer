/* Original Linux-only filter demo. Restricts ONLY this program, never its shell. */
/* @step headers */
#define _GNU_SOURCE
#include <errno.h>
#include <linux/audit.h>
#include <linux/filter.h>
#include <linux/seccomp.h>
#include <stddef.h>
#include <stdio.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <unistd.h>

/* Syscall numbers depend on the ABI. Refuse unreviewed architectures. */
#if defined(__aarch64__)
#define DEMO_ARCH AUDIT_ARCH_AARCH64
#elif defined(__x86_64__) && !defined(__ILP32__)
#define DEMO_ARCH AUDIT_ARCH_X86_64
#else
#error "This example supports native aarch64 and x86-64 Linux only"
#endif

int main(void) {
    /* @step baseline */
    /* syscall requests the native syscall directly. -1 indicates failure. */
    /* Zero is valid if the parent is outside this process's PID namespace. */
    long before = syscall(SYS_getppid);
    if (before == -1) {
        perror("baseline getppid");
        return 1;
    }
    /* @step filter */
    /* This small BPF program checks architecture, then one syscall number. */
    /* jt/jf jump over that many instructions on true/false comparisons. */
    struct sock_filter instructions[] = {
        BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, arch)),
        BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, DEMO_ARCH, 1, 0),
        BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_KILL_PROCESS),
        BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, nr)),
#if defined(__x86_64__)
        /* x32 uses the same audit architecture but another syscall-number bit. */
        BPF_JUMP(BPF_JMP | BPF_JSET | BPF_K, 0x40000000, 0, 1),
        BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_KILL_PROCESS),
#endif
        BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, SYS_getppid, 0, 1),
        BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ERRNO | EPERM),
        BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW)
    };
    struct sock_fprog program = {
        .len = (unsigned short)(sizeof(instructions) / sizeof(instructions[0])),
        .filter = instructions
    };
    /* @step install */
    /* no_new_privs is per thread, inherited across fork/exec, and irreversible. */
    /* This program has one thread; this prctl installs on the calling thread. */
    /* Children inherit its filter; allowed exec preserves it. No TSYNC is used. */
    if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) == -1) {
        perror("PR_SET_NO_NEW_PRIVS; no filter installed");
        return 77;
    }
    if (prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &program) == -1) {
        perror("seccomp installation unavailable; no successful mechanism test");
        return 77;
    }
    /* @step observe */
    errno = 0;
    long after = syscall(SYS_getppid);
    int denied = after == -1 && errno == EPERM;
    long own_pid = syscall(SYS_getpid);
    if (!denied || own_pid <= 0) {
        fputs("filter did not show the expected boundary\n", stderr);
        return 1;
    }
    puts("getppid before=allowed after=EPERM getpid=allowed");
    /* This deny-one filter leaves almost every other syscall available. */
    /* It is an observation of syscall mediation, NOT a useful complete sandbox. */
    return 0;
}
