#include <stdio.h>

int main(void) {
    int a;
    float b;
    char c;
    char d[] = "Hello World!";

    int *pi;
    float *pf;
    char *pc;

    a = 1;
    b = 2.0f;
    c = 'x';

    pi = &a;
    pf = &b;
    pc = &c;

    printf("Address pointed to by pi: %p, value at that address: %d\n", (void *)pi, *pi);
    printf("Address pointed to by pf: %p, value at that address: %f\n", (void *)pf, *pf);
    printf("Address pointed to by pc: %p, value at that address: %c\n", (void *)pc, *pc);

    pc = d;
    printf("Address pointed to by pc: %p, value at that address: %c\n", (void *)pc, *pc);
    pc++;
    printf("Address pointed to by pc: %p, value at that address: %c\n", (void *)pc, *pc);
    (*pc)++;
    printf("Address pointed to by pc: %p, value at that address: %c\n", (void *)pc, *pc);

    printf("%s\n", d);

    return 0;
}
