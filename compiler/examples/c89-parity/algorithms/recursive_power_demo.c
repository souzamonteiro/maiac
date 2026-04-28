#include <stdio.h>

int power_recursive(int base, int exponent) {
    if (exponent == 0) return 1;
    return base * power_recursive(base, exponent - 1);
}

int main(void) {
    printf("pow(3,4)=%d\n", power_recursive(3, 4));
    printf("pow(5,0)=%d\n", power_recursive(5, 0));
    return 0;
}
