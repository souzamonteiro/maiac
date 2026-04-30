/* constructors_and_destructors: Constructors become init functions;        */
/* destructors become destroy functions. In C there is no automatic          */
/* invocation - the caller is responsible for initializing and cleaning up.  */
#include <stdio.h>

typedef struct {
    int height;
    int base;
} Rectangle;

/* Constructor - initializes the struct fields (equivalent to Rectangle(a, b)) */
void rectangle_init(Rectangle *r, int a, int b) {
    r->height = a;
    r->base = b;
}

/* Destructor - no dynamic memory here, but the pattern is shown */
void rectangle_destroy(Rectangle *r) {
    (void)r;  /* nothing to free */
}

void rectangle_set_values(Rectangle *r, int a, int b) {
    r->height = a;
    r->base = b;
}

int rectangle_calc_area(Rectangle *r) {
    return r->base * r->height;
}

int main(void) {
    Rectangle rectangle;

    rectangle_init(&rectangle, 4, 5);

    printf("The area of the rectangle is %d.\n", rectangle_calc_area(&rectangle));

    rectangle_destroy(&rectangle);

    return 0;
}
