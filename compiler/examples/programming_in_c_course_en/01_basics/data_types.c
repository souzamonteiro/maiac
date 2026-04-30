#include <stdio.h>

int main(void) {
    int x;                   /* Integer between -2147483648 and 2147483647. */
    float y;                 /* Single-precision floating point. */
    double z;                /* Double-precision floating point. */
    char a;                  /* A single ASCII character. */
    char b[] = "Hello World";  /* Character string (array of char). */

    x = 1;
    y = 2;
    z = 3;
    a = 'A';

    printf("%d\n", x);   /* We use \n to move to a new line on screen. */
    printf("%f\n", y);
    printf("%f\n", z);
    printf("%c\n", a);
    printf("%s\n", b);

    return 0;
}
