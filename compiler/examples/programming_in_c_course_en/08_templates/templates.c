#include <stdio.h>

/* C89 has no templates.
 * Use typed helpers + macros to keep call-sites concise.
 */
int tmax_int(int a, int b) {
    return (a > b) ? a : b;
}

float tmax_float(float a, float b) {
    return (a > b) ? a : b;
}

#define TMAX_INT(a, b)   tmax_int((a), (b))
#define TMAX_FLOAT(a, b) tmax_float((a), (b))

int main(void) {
    printf("The greater value between %d and %d is %d.\n", 1, 2, TMAX_INT(1, 2));
    printf("The greater value between %.1f and %.1f is %.1f.\n", 3.2f, 3.7f, TMAX_FLOAT(3.2f, 3.7f));

    return 0;
}
