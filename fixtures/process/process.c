#include "process.h"
int allocate_pid(int seed); /* repeated declaration */
int next_pid = 100;
static int helper(int value) { return value + 1; }
int allocate_pid(int seed) { return helper(seed) + next_pid++; }
int spawn_task(task_t *task, int (*callback)(int)) {
    task->pid = PREPARE_PID(1);
    task->pid += callback(task->pid);
    if (task->prepare) task->pid += task->prepare(task->pid);
#ifdef ENABLE_AUDIT
    task->pid = helper(task->pid);
#endif
    return task->pid;
}
