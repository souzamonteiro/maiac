#include <stdio.h>

void display_message(char text[]) {
    printf("%s\n", text);
}

int square(int x) {
    return x * x;
}

int main(void) {
    char msg[] = "Hello World!";

    display_message(msg);

    printf("The square of 5 is %d.\n", square(5));

    return 0;
}
