#ifndef PROCESS_H
#define PROCESS_H
struct task { int pid; int (*prepare)(int); };
typedef struct task task_t;
enum clone_mode { CLONE_SHARED, CLONE_PRIVATE };
extern int next_pid;
int allocate_pid(int seed);
int spawn_task(task_t *task, int (*callback)(int));
#define PREPARE_PID(seed) allocate_pid(seed)
#endif
