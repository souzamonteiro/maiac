#include <stdio.h>

void draw_triangle(int rows, int level) {
    if (level > rows) return;
    int i;
    for (i = 0; i < level; ++i) {
        putchar('^');
    }
    putchar('\n');
    draw_triangle(rows, level + 1);
}

int main(void) {
    draw_triangle(5, 1);
    return 0;
}
