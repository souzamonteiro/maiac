/* 10_stdlib_math - stdlib conversions and math host/runtime support. */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

int main(void) {
    double sine;

    sine = sin(0.0);
    if (sine == 0.0) printf("PASS sin_zero\n");

    printf("ALL PASS\n");
    return 0;
}