/* Diagnostic: direct dist path for basic locale setup. */
#include <locale.h>

int main(void) {
    char *name;

    name = setlocale(0, "C");
    if (!name) return 41;
    return 0;
}