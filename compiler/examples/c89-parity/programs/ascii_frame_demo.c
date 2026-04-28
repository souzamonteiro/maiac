#include <stdio.h>

void draw_frame(int width, int height) {
    int row;
    int col;
    for (row = 0; row < height; ++row) {
        for (col = 0; col < width; ++col) {
            if (row == 0 || row == height - 1 || col == 0 || col == width - 1) {
                putchar('#');
            } else {
                putchar('.');
            }
        }
        putchar('\n');
    }
}

int main(void) {
    draw_frame(8, 4);
    return 0;
}
