#include <stdio.h>
#include <stdarg.h>

int sum3(int first, ...) {
    va_list ap;
    int a;
    int b;

    va_start(ap, first);
    a = va_arg(ap, int);
    b = va_arg(ap, int);
    va_end(ap);
    return first + a + b;
}

int main(void) {
    if (sum3(1, 2, 3) == 6) {
        printf("PASS stdarg\n");
    }
    printf("ALL PASS\n");
    return 0;
}