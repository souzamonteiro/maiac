#include <stdio.h>

typedef int (*binary_op)(int, int);

int op_add(int a, int b) { return a + b; }
int op_sub(int a, int b) { return a - b; }
int op_mul(int a, int b) { return a * b; }

int main(void) {
    const char *labels[3];
    binary_op ops[3];
    int a = 9;
    int b = 4;
    int i;

    labels[0] = "add";
    labels[1] = "sub";
    labels[2] = "mul";

    ops[0] = op_add;
    ops[1] = op_sub;
    ops[2] = op_mul;

    for (i = 0; i < 3; ++i) {
        printf("%s(%d,%d)=%d\n", labels[i], a, b, ops[i](a, b));
    }

    return 0;
}
