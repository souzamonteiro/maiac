#include <stdio.h>

int factorial_recursive(int n) {
    if (n <= 1) return 1;
    return n * factorial_recursive(n - 1);
}

int main(void) {
    printf("fact5=%d\n", factorial_recursive(5));
    printf("fact7=%d\n", factorial_recursive(7));
    return 0;
}
