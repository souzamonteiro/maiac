#include <stdio.h>

int main(void) {
    int a = 1;
    int b = 2;
    int c;

    c = a + b;                        /* Addition. */
    printf("a + b = %d\n", c);

    c = a - b;                        /* Subtraction. */
    printf("a - b = %d\n", c);

    c = a * b;                        /* Multiplication. */
    printf("a * b = %d\n", c);

    c = a / b;                        /* Division. */
    printf("a / b = %d\n", c);

    c = a % b;                        /* Remainder (modulo). */
    printf("a %% b = %d\n", c);

    c = a < b;                        /* Less than. */
    printf("a < b = %d\n", c);

    c = a <= b;                       /* Less than or equal. */
    printf("a <= b = %d\n", c);

    c = a > b;                        /* Greater than. */
    printf("a > b = %d\n", c);

    c = a >= b;                       /* Greater than or equal. */
    printf("a >= b = %d\n", c);

    c = a == b;                       /* Equal to. */
    printf("a == b = %d\n", c);

    c = a != b;                       /* Not equal to. */
    printf("a != b = %d\n", c);

    b = 0;

    c = a && b;                       /* Logical AND. */
    printf("a && b = %d\n", c);

    c = a || b;                       /* Logical OR. */
    printf("a || b = %d\n", c);

    a++;                              /* Increment (+1). */
    printf("a = %d\n", a);

    b--;                              /* Decrement (-1). */
    printf("b = %d\n", b);

    return 0;
}
