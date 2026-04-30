#include <stdio.h>

/* C has no operator overloading. We implement explicit vector_add(). */
typedef struct {
    int x;
    int y;
} Vector;

Vector vector_add(Vector a, Vector b) {
    Vector temp;
    temp.x = a.x + b.x;
    temp.y = a.y + b.y;
    return temp;
}

int main(void) {
    Vector a;
    Vector b;
    Vector c;

    a.x = 3;
    a.y = 1;
    b.x = 1;
    b.y = 2;

    c = vector_add(a, b);

    printf("c = %d, %d.\n", c.x, c.y);

    return 0;
}
