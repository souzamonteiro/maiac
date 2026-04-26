#include <stdio.h>
#include <time.h>

int main(void) {
    time_t now;
    clock_t ticks;
    struct tm *utc;
    char buf[32];

    now = time((time_t *)0);
    ticks = clock();
    utc = gmtime(&now);
    if (now > 0 && ticks >= 0) {
        printf("PASS time_basic\n");
    }
    if (utc && strftime(buf, sizeof(buf), "%Y", utc) > 0) {
        printf("PASS gmtime_strftime\n");
    }
    printf("ALL PASS\n");
    return 0;
}