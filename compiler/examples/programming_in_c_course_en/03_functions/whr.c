#include <stdio.h>

float calcWHR(float waist, float hip) {
    return waist / hip;
}

int main(void) {
    float waist;
    float hip;

    printf("Enter your waist circumference in cm: ");
    scanf("%f", &waist);
    printf("Enter your hip circumference in cm: ");
    scanf("%f", &hip);

    printf("WHR: %f.\n", calcWHR(waist, hip));

    return 0;
}
