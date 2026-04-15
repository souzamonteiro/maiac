#include <stdlib.h>

static int cmp_int_asc(const void *a, const void *b) {
    const int *ia = (const int *)a;
    const int *ib = (const int *)b;
    if (*ia < *ib) return -1;
    if (*ia > *ib) return 1;
    return 0;
}

int main(void) {
    int *arr;
    int *zeros;
    int values[6];
    int r;
    int i;
    
    /* Test malloc */
    arr = (int *)malloc(10 * sizeof(int));
    if (arr == NULL) return 1;
    
    for (i = 0; i < 10; i++) {
        arr[i] = i * i;
    }
    
    /* Test realloc */
    arr = (int *)realloc(arr, 20 * sizeof(int));
    if (arr == NULL) return 1;
    
    for (i = 10; i < 20; i++) {
        arr[i] = i * i;
    }
    
    /* Test calloc */
    zeros = (int *)calloc(5, sizeof(int));
    if (zeros != NULL) {
        for (i = 0; i < 5; i++) {
            if (zeros[i] != 0) return 1;
        }
        free(zeros);
    }
    
    /* Test qsort */
    values[0] = 5;
    values[1] = 2;
    values[2] = 8;
    values[3] = 1;
    values[4] = 9;
    values[5] = 3;
    qsort(values, 6, sizeof(int), cmp_int_asc);
    for (i = 1; i < 6; i++) {
        if (values[i - 1] > values[i]) return 1;
    }
    
    /* Test random */
    srand(42);
    for (i = 0; i < 10; i++) {
        r = rand();
        if (r < 0 || r > RAND_MAX) return 1;
    }
    
    free(arr);
    
    return 0;
}