#include <stdio.h>
#include <stdarg.h>

int sum_many(int count, ...) {
    va_list args;
    int total = 0;
    int i;

    va_start(args, count);
    for (i = 0; i < count; ++i) {
        total += va_arg(args, int);
    }
    va_end(args);
    return total;
}

int main(void) {
    printf("sum=%d\n", sum_many(5, 2, 4, 6, 8, 10));
    return 0;
}
