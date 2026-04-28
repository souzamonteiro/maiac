#include <stdio.h>

void selection_sort(int *arr, int n) {
    int i;
    for (i = 0; i < n - 1; ++i) {
        int best = i;
        int j;
        for (j = i + 1; j < n; ++j) {
            if (arr[j] < arr[best]) best = j;
        }
        if (best != i) {
            int tmp = arr[i];
            arr[i] = arr[best];
            arr[best] = tmp;
        }
    }
}

int main(void) {
    int values[5] = {42, 7, 19, 3, 11};
    int i;
    selection_sort(values, 5);
    for (i = 0; i < 5; ++i) {
        printf("%d\n", values[i]);
    }
    return 0;
}
