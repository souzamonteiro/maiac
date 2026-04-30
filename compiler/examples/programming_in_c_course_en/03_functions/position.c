#include <stdio.h>

int main(void) {
    float position;
    float initial_position;
    float velocity;
    float time;

    printf("Enter the initial position of the object in m: ");
    scanf("%f", &initial_position);
    printf("Enter the velocity of the object in m/s: ");
    scanf("%f", &velocity);
    printf("Enter the elapsed time in s: ");
    scanf("%f", &time);

    position = initial_position + velocity * time;

    printf("Current position of the object: %.2f m.\n", position);

    return 0;
}
