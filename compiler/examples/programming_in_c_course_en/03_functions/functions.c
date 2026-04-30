#include <stdio.h>

void hello_world(void) {
    printf("Hello World!\n");
}

void display_message(const char msg[]) {
    printf("%s\n", msg);
}

float square(float x) {
    return x * x;
}

float power(float x, int y) {
    int i;
    float p;

    p = 1;
    for (i = 0; i < y; i++) {
        p = p * x;
    }

    return p;
}

int main(void) {
    hello_world();

    display_message("Hi there!");

    printf("The square of 5 is %g.\n", square(5));

    printf("The cube of 2 is %g.\n", power(2, 3));

    return 0;
}
