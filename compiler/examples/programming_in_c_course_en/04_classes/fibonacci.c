/* fibonacci: The Fibonacci class becomes two plain C functions.           */
/* string createSeries() is replaced by printing directly inside the loop. */
/*                                                                          */
/*  1 2 3 4 5 6  7  8  9 10                                                 */
/*  1 1 2 3 5 8 13 21 34 55                                                 */
/*  F(n) = F(n-1) + F(n-2), F(1) = F(2) = 1                                */
#include <stdio.h>

int fibonacci_n(int n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci_n(n - 1) + fibonacci_n(n - 2);
}

void print_fibonacci_series(int n) {
    int i;
    for (i = 1; i <= n; i++) {
        printf(" %d", fibonacci_n(i));
    }
    printf("\n");
}

int main(void) {
    int n;

    printf("How many terms would you like to display? ");
    scanf("%d", &n);
    printf("\n");

    print_fibonacci_series(n);

    return 0;
}
