/* 04_arrays - 1D arrays, 2D matrices, sorting, lookup. */
#include <stdio.h>

int sum_array(int *arr, int n) {
    int i;
    int sum;
    sum = 0;
    for (i = 0; i < n; ++i) sum += arr[i];
    return sum;
}

void bubble_sort(int *arr, int n) {
    int i;
    int j;
    int temp;
    for (i = 0; i < n - 1; ++i) {
        for (j = 0; j < n - 1 - i; ++j) {
            if (arr[j] > arr[j + 1]) {
                temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

int main(void) {
    int values[5];
    int matrix[3][3];
    int sortable[5];
    int trace;

    values[0] = 2;
    values[1] = 4;
    values[2] = 6;
    values[3] = 8;
    values[4] = 10;
    if (sum_array(values, 5) == 30) printf("PASS array_sum\n");

    matrix[0][0] = 1; matrix[0][1] = 2; matrix[0][2] = 3;
    matrix[1][0] = 4; matrix[1][1] = 5; matrix[1][2] = 6;
    matrix[2][0] = 7; matrix[2][1] = 8; matrix[2][2] = 9;
    trace = matrix[0][0] + matrix[1][1] + matrix[2][2];
    if (trace == 15) printf("PASS matrix_trace\n");

    sortable[0] = 5;
    sortable[1] = 1;
    sortable[2] = 4;
    sortable[3] = 2;
    sortable[4] = 3;
    bubble_sort(sortable, 5);
    if (sortable[0] == 1 && sortable[4] == 5) printf("PASS bubble_sort\n");

    printf("ALL PASS\n");
    return 0;
}