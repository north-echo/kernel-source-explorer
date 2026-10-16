#include "process.h"
static int helper(int value) { return value - 1; }
int inspect_task(void) { return helper(4); }
