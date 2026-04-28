#include <stdio.h>

void merge(int *arr, int left, int mid, int right) {
    int temp[16];
    int i = left;
    int j = mid + 1;
    int k = 0;
    int idx;

    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) temp[k++] = arr[i++];
        else temp[k++] = arr[j++];
    }
    while (i <= mid) temp[k++] = arr[i++];
    while (j <= right) temp[k++] = arr[j++];

    for (idx = 0; idx < k; ++idx) {
        arr[left + idx] = temp[idx];
    }
}

void merge_sort(int *arr, int left, int right) {
    if (left < right) {
        int mid = left + (right - left) / 2;
        merge_sort(arr, left, mid);
        merge_sort(arr, mid + 1, right);
        merge(arr, left, mid, right);
    }
}

int main(void) {
    int values[8] = {9, 1, 8, 2, 7, 3, 6, 4};
    int i;
    merge_sort(values, 0, 7);
    for (i = 0; i < 8; ++i) {
        printf("%d\n", values[i]);
    }
    return 0;
}
