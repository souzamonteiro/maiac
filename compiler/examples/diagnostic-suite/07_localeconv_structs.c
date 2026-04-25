/* Diagnostic: direct dist path for localeconv struct-backed access. */
#include <locale.h>

int main(void) {
    struct lconv *conv;

    conv = localeconv();
    if (!conv || !conv->decimal_point) return 42;
    return 0;
}