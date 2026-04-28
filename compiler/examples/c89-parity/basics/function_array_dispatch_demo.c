#include <stdio.h>

typedef int (*step_fn)(int);

int add_two(int x) { return x + 2; }
int times_three(int x) { return x * 3; }
int minus_four(int x) { return x - 4; }

int main(void) {
    step_fn steps[3];
    int value = 1;
    int i;

    steps[0] = add_two;
    steps[1] = times_three;
    steps[2] = minus_four;

    for (i = 0; i < 3; ++i) {
        value = steps[i](value);
        printf("step%d=%d\n", i, value);
    }

    return 0;
}
