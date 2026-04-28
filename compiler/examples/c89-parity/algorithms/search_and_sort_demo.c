#include <stdio.h>

void insertion_sort(int *arr, int n) {
    int i;
    for (i = 1; i < n; ++i) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            --j;
        }
        arr[j + 1] = key;
    }
}

int binary_search(const int *arr, int n, int target) {
    int left = 0;
    int right = n - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return -1;
}

void print_array(const int *arr, int n) {
    int i;
    for (i = 0; i < n; ++i) {
        if (i > 0) printf(",");
        printf("%d", arr[i]);
    }
    printf("\n");
}

int main(void) {
    int values[8] = {12, 5, 19, 2, 11, 8, 3, 17};
    int index;

    insertion_sort(values, 8);
    print_array(values, 8);

    index = binary_search(values, 8, 11);
    printf("index_of_11=%d\n", index);

    index = binary_search(values, 8, 4);
    printf("index_of_4=%d\n", index);

    return 0;
}
