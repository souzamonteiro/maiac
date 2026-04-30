/* class_model: C++ classes become C structs with associated functions. */
/* Members can be public (accessible freely) or private (accessible only      */
/* through functions). In C, all struct fields are public by convention.      */
/* Encapsulation is achieved by passing a struct pointer to functions.        */
#include <stdio.h>

typedef struct {
    int height;   /* private by convention - access via functions below */
    int base;
} Rectangle;

void rectangle_set_values(Rectangle *r, int a, int b) {
    r->height = a;
    r->base = b;
}

int rectangle_calc_area(Rectangle *r) {
    return r->base * r->height;
}

int main(void) {
    Rectangle rectangle;

    rectangle_set_values(&rectangle, 4, 5);

    printf("The area of the rectangle is %d.\n", rectangle_calc_area(&rectangle));

    return 0;
}
