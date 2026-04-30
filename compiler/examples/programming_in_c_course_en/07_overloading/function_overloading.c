#include <stdio.h>

/* C has no overloads, so keep one function per concrete type. */
float fahrenheit_to_celsius_float(float t) {
    return (t - 32.0f) * 5.0f / 9.0f;
}

int fahrenheit_to_celsius_int(int t) {
    return (t - 32) * 5 / 9;
}

int main(void) {
    int t1;
    float t2;

    printf("Enter the temperature in Fahrenheit as an integer: ");
    scanf("%d", &t1);
    printf("The temperature in Celsius is %d.\n", fahrenheit_to_celsius_int(t1));

    printf("Enter the temperature in Fahrenheit as a real number: ");
    scanf("%f", &t2);
    printf("The temperature in Celsius is %f.\n", fahrenheit_to_celsius_float(t2));

    return 0;
}
