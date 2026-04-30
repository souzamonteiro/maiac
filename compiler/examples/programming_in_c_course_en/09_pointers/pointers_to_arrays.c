#include <stdio.h>

int main(void) {
    int a = 1;
    int b = 255;
    int c[3];
    int d[] = {4, 5, 6};
    int *p;
    int i;

    c[0] = 1;
    c[1] = 2;
    c[2] = 3;

    p = &a;
    printf("Value pointed to by p: %d.\n", *p);
    printf("The memory address pointed to by p is %p.\n", (void *)p);

    p = &b;
    printf("Value pointed to by p: %d.\n", *p);
    printf("The memory address pointed to by p is %p.\n", (void *)p);

    p = d;
    printf("Value pointed to by p: %d.\n", *p);
    printf("The memory address pointed to by p is %p.\n", (void *)p);

    p++;
    printf("Value pointed to by p: %d.\n", *p);
    printf("The memory address pointed to by p is %p.\n", (void *)p);

    *p = 7;

    for (i = 0; i < (int)(sizeof(d) / sizeof(int)); i++) {
        printf("d[%d] = %d.\n", i, d[i]);
    }

    return 0;
}
