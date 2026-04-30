/* inheritance: C++ inheritance is modelled in C by embedding the "base"     */
/* struct as the first field of the "derived" struct. This allows a pointer  */
/* to the derived struct to be safely cast to a pointer to the base struct.  */
#include <stdio.h>

/* Base "class" */
typedef struct {
    int height;
    int width;
} Polygon;

void polygon_set_values(Polygon *p, int a, int b) {
    p->height = a;
    p->width = b;
}

/* Derived "class" Rectangle - first field is the base */
typedef struct {
    Polygon base;
} Rectangle;

int rectangle_calc_area(Rectangle *r) {
    return r->base.width * r->base.height;
}

/* Derived "class" Triangle */
typedef struct {
    Polygon base;
} Triangle;

int triangle_calc_area(Triangle *t) {
    return t->base.width * t->base.height / 2;
}

int main(void) {
    Rectangle rectangle;
    Triangle triangle;

    polygon_set_values(&rectangle.base, 4, 3);
    polygon_set_values(&triangle.base, 4, 3);

    printf("The area of the rectangle is %d.\n", rectangle_calc_area(&rectangle));
    printf("The area of the triangle is %d.\n", triangle_calc_area(&triangle));

    return 0;
}
