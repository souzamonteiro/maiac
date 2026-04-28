#include <stdio.h>

void swap_bytes(char *a, char *b, int size) {
    int i;
    for (i = 0; i < size; ++i) {
        char tmp = a[i];
        a[i] = b[i];
        b[i] = tmp;
    }
}

int main(void) {
    int left = 7;
    int right = 21;
    char c1 = 'A';
    char c2 = 'Z';

    swap_bytes((char *)&left, (char *)&right, (int)sizeof(int));
    swap_bytes((char *)&c1, (char *)&c2, (int)sizeof(char));

    printf("ints=%d,%d\n", left, right);
    printf("chars=%c,%c\n", c1, c2);
    return 0;
}
