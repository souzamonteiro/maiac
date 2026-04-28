#include <stdio.h>

struct Point {
    int x;
    int y;
};

struct Box {
    struct Point origin;
    int width;
    int height;
};

int box_area(struct Box b) {
    return b.width * b.height;
}

int perimeter(struct Box b) {
    return 2 * (b.width + b.height);
}

int main(void) {
    struct Box b;

    b.origin.x = 3;
    b.origin.y = 5;
    b.width = 7;
    b.height = 4;

    printf("origin=(%d,%d)\n", b.origin.x, b.origin.y);
    printf("area=%d\n", box_area(b));
    printf("perimeter=%d\n", perimeter(b));

    return 0;
}
