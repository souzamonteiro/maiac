#include <stdio.h>

float calcBMI(float weight, float height) {
    return weight / (height * height);
}

int main(void) {
    float weight;
    float height;

    printf("Enter your weight in kg: ");
    scanf("%f", &weight);
    printf("Enter your height in m: ");
    scanf("%f", &height);

    printf("BMI: %f.\n", calcBMI(weight, height));

    return 0;
}
