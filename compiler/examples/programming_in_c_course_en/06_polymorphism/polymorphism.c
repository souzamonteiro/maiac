/* polymorphism: Virtual methods in C++ become function pointers in C.      */
#include <stdio.h>

typedef struct Polygon Polygon;

struct Polygon {
    int height;
    int width;
    int (*calc_area)(Polygon *self);
};

void polygon_set_values(Polygon *p, int a, int b) {
    p->height = a;
    p->width = b;
}

int rectangle_calc_area(Polygon *self) {
    return self->width * self->height;
}

int triangle_calc_area(Polygon *self) {
    return self->width * self->height / 2;
}

int main(void) {
    Polygon rectangle;
    Polygon triangle;

    rectangle.calc_area = rectangle_calc_area;
    triangle.calc_area = triangle_calc_area;

    polygon_set_values(&rectangle, 4, 3);
    polygon_set_values(&triangle, 4, 3);

    printf("The area of the rectangle is %d.\n", rectangle.calc_area(&rectangle));
    printf("The area of the triangle is %d.\n", triangle.calc_area(&triangle));

    return 0;
}
