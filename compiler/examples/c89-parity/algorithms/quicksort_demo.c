#include <stdio.h>

void swap_int(int *a, int *b) {
    int tmp = *a;
    *a = *b;
    *b = tmp;
}

int partition(int *arr, int low, int high) {
    int pivot = arr[high];
    int i = low - 1;
    int j;
    for (j = low; j < high; ++j) {
        if (arr[j] <= pivot) {
            ++i;
            swap_int(&arr[i], &arr[j]);
        }
    }
    swap_int(&arr[i + 1], &arr[high]);
    return i + 1;
}

void quicksort(int *arr, int low, int high) {
    if (low < high) {
        int p = partition(arr, low, high);
        quicksort(arr, low, p - 1);
        quicksort(arr, p + 1, high);
    }
}

int main(void) {
    int values[6] = {14, 3, 11, 7, 2, 9};
    int i;
    quicksort(values, 0, 5);
    for (i = 0; i < 6; ++i) {
        printf("%d\n", values[i]);
    }
    return 0;
}
