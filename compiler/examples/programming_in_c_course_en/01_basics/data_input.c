#include <stdio.h>

int main(void) {
    int age;
    float height;
    char name[255];   /* A char[n] variable holds a string of up to n characters. */

    printf("Enter your age: ");
    scanf("%d", &age);                    /* We read typed data using scanf. */
    printf("You are %d years old.\n", age);

    printf("Enter your height in meters: ");
    scanf("%f", &height);
    printf("You are %f meters tall.\n", height);

    printf("Enter your name: ");
    scanf("%s", name);
    printf("Hello %s!\n", name);

    return 0;
}
