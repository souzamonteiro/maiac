#include <stdio.h>

int factorial_iterative(int n) {
    int result = 1;
    int i;
    for (i = 2; i <= n; ++i) {
        result *= i;
    }
    return result;
}

int main(void) {
    printf("fact6=%d\n", factorial_iterative(6));
    printf("fact3=%d\n", factorial_iterative(3));
    return 0;
}
