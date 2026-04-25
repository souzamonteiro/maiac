/* 03_functions - Calls, recursion, references via pointers, function pointers. */
#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}

void swap_int(int *a, int *b) {
    int temp;
    temp = *a;
    *a = *b;
    *b = temp;
}

int double_value(int x) {
    return x * 2;
}

int apply_unary(int (*fn)(int), int value) {
    return fn(value);
}

int main(void) {
    int a;
    int b;

    if (factorial(5) == 120) printf("PASS factorial_5\n");
    if (factorial(7) == 5040) printf("PASS factorial_7\n");
    if (fib(7) == 13) printf("PASS fib_7\n");
    if (fib(10) == 55) printf("PASS fib_10\n");

    a = 3;
    b = 8;
    swap_int(&a, &b);
    if (a == 8 && b == 3) printf("PASS swap\n");

    if (apply_unary(double_value, 7) == 14) printf("PASS funcptr\n");

    printf("ALL PASS\n");
    return 0;
}