/* Diagnostic: direct dist path for basic time/clock host-backed calls. */
#include <time.h>

int main(void) {
    time_t now;
    clock_t ticks;

    now = time((time_t *)0);
    ticks = clock();
    if (now <= 0) return 31;
    if (ticks < 0) return 32;
    return 0;
}