#include <stdio.h>

typedef struct {
    int x;
    int y;
} Vector;

void vector_init(Vector *v, int a, int b) {
    v->x = a;
    v->y = b;
}

Vector vector_add(Vector a, Vector b) {
    Vector temp;
    temp.x = a.x + b.x;
    temp.y = a.y + b.y;
    return temp;
}

Vector vector_sub(Vector a, Vector b) {
    Vector temp;
    temp.x = a.x - b.x;
    temp.y = a.y - b.y;
    return temp;
}

int vector_get_x(Vector *v) {
    return v->x;
}

int vector_get_y(Vector *v) {
    return v->y;
}

int main(void) {
    Vector a;
    Vector b;
    Vector c;
    Vector d;

    vector_init(&a, 1, 2);
    vector_init(&b, 3, 4);

    c = vector_add(a, b);
    d = vector_sub(a, b);

    printf("c(%d,%d)\n", vector_get_x(&c), vector_get_y(&c));
    printf("d(%d,%d)\n", vector_get_x(&d), vector_get_y(&d));

    return 0;
}
