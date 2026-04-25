/* Diagnostic: direct dist path for gmtime/strftime struct-backed time flow. */
#include <time.h>

int main(void) {
    time_t now;
    struct tm *utc;
    char buf[64];

    now = time((time_t *)0);
    utc = gmtime(&now);
    if (!utc) return 11;
    if (strftime(buf, sizeof(buf), "%Y-%m-%d", utc) == 0) return 12;
    return 0;
}