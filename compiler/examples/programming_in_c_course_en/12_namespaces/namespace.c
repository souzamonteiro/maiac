#include <stdio.h>

/* C has no namespaces; use prefix-based naming convention. */
const float numeric_golden = 1.1680f;
const float numeric_pi = 3.1416f;

int main(void) {
    printf("The golden ratio is %f.\n", numeric_golden);
    printf("The number pi is %f.\n", numeric_pi);

    return 0;
}
