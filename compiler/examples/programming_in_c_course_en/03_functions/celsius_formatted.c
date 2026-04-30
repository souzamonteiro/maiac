#include <stdio.h>

float celsius(float f) {
    return (f - 32.0f) / 1.8f;
}

int main(void) {
    float f;

    printf("Enter the temperature in Fahrenheit: ");
    scanf("%f", &f);

    printf("Temperature in Celsius: %.2f.\n", celsius(f));

    return 0;
}
