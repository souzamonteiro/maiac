/* 05_pointers - Pointer arithmetic, pointer-to-pointer, arrays of pointers. */
#include <stdio.h>

int main(void) {
    int x = 10;
    int y = 25;
    int *p = &x;
    int **pp = &p;
    int vals[4] = {1, 2, 3, 4};
    int *ptrs[4];
    int i;
    int sum = 0;

    if (*p == 10) printf("PASS pointer_read\n");
    if (*(vals + 2) == 3) printf("PASS pointer_arith\n");

    **pp = 12;
    if (x == 12) printf("PASS pointer_to_pointer\n");

    for (i = 0; i < 4; ++i) {
        ptrs[i] = &vals[i];
        sum += *ptrs[i];
    }
    if (sum == 10) printf("PASS pointer_array\n");

    p = &y;
    *p = 64;
    if (y == 64) printf("PASS pointer_write\n");

    printf("ALL PASS\n");
    return 0;
}