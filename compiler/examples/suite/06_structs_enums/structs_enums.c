/* 06_structs_enums - Struct, union, enum, typedef patterns. */
#include <stdio.h>

struct point {
    int x;
    int y;
};

struct rectangle {
    struct point top_left;
    struct point bottom_right;
};

union value {
    int integer;
    double floating;
};

enum color {
    COLOR_RED,
    COLOR_GREEN = 5,
    COLOR_BLUE
};

typedef struct point Point;

int main(void) {
    Point p;
    struct rectangle rect;
    union value v;
    enum color color;

    p.x = 3;
    p.y = 4;
    if (p.x == 3 && p.y == 4) printf("PASS struct_point\n");

    rect.top_left.x = 0;
    rect.top_left.y = 0;
    rect.bottom_right.x = 10;
    rect.bottom_right.y = 20;
    if (rect.bottom_right.x == 10 && rect.bottom_right.y == 20) printf("PASS nested_struct\n");

    v.integer = 42;
    if (v.integer == 42) printf("PASS union_int\n");

    color = COLOR_BLUE;
    if (color == 6) printf("PASS enum_value\n");

    printf("ALL PASS\n");
    return 0;
}