#include <stdio.h>

/* C has no namespaces; use prefix-based naming convention. */
const float numeric_pi = 3.1415269f;

int main(void) {
    printf("PI number: %f\n", numeric_pi);
    printf("PI number: %0.7f", numeric_pi);

    return 0;
}
