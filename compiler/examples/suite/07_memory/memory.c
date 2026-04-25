/* 07_memory - malloc/free and dynamic writes. */
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *buffer;

    buffer = (int *)malloc(sizeof(int));
    *buffer = 55;
    if (*buffer == 55) printf("PASS malloc_scalar\n");

    free(buffer);
    printf("PASS free\n");
    printf("ALL PASS\n");
    return 0;
}