#include <stdio.h>

struct Counter;

typedef int (*counter_action)(struct Counter *, int);

struct Counter {
    int value;
    counter_action change;
};

int apply_delta(struct Counter *self, int delta) {
    self->value += delta;
    return self->value;
}

int main(void) {
    struct Counter c;
    c.value = 10;
    c.change = apply_delta;

    printf("v1=%d\n", c.change(&c, 5));
    printf("v2=%d\n", c.change(&c, -3));
    return 0;
}
