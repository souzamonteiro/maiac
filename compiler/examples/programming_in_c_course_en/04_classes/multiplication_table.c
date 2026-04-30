/* multiplication_table: The MultiplicationTable class becomes a plain     */
/* function in C - no state is needed, so no struct is required.           */
#include <stdio.h>

void create_table(int n) {
    int i;
    for (i = 1; i <= 10; i++) {
        printf("%d x %d = %d\n", n, i, n * i);
    }
}

int main(void) {
    int n;

    printf("Which multiplication table would you like to display? ");
    scanf("%d", &n);
    printf("\n");

    create_table(n);

    return 0;
}
