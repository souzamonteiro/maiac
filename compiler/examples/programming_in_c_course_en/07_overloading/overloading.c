#include <stdio.h>

/* C has no function overloading, so we use explicit names by type. */
int square_int(int x) {
    return x * x;
}

float square_float(float x) {
    return x * x;
}

int main(void) {
    int x1;
    float x2;

    printf("Enter an integer: ");
    scanf("%d", &x1);

    printf("Enter a real number: ");
    scanf("%f", &x2);

    printf("The square of %d is: %d\n", x1, square_int(x1));
    printf("The square of %f is: %f\n", x2, square_float(x2));

    return 0;
}
