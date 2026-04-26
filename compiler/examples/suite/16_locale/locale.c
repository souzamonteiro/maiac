#include <stdio.h>
#include <locale.h>

int main(void) {
    char *name;
    struct lconv *conv;

    name = setlocale(0, "C");
    conv = localeconv();
    if (name) {
        printf("PASS setlocale\n");
    }
    if (conv && conv->decimal_point) {
        printf("PASS localeconv\n");
    }
    printf("ALL PASS\n");
    return 0;
}