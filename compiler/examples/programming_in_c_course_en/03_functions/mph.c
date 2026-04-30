#include <stdio.h>

int main(void) {
    float mph;
    float kmh;

    printf("Enter the speed in km/h: ");
    scanf("%f", &kmh);

    mph = kmh / 1.61f;

    printf("Speed in mph: %f.\n", mph);

    return 0;
}
