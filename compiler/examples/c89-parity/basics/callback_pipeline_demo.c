#include <stdio.h>

typedef int (*transform_fn)(int);

int increment(int x) { return x + 1; }
int square(int x) { return x * x; }
int halve_floor(int x) { return x / 2; }

int apply_pipeline(int seed, transform_fn first, transform_fn second, transform_fn third) {
    return third(second(first(seed)));
}

int main(void) {
    printf("pipeline=%d\n", apply_pipeline(5, increment, square, halve_floor));
    return 0;
}
