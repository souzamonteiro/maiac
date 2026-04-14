#include "maiac_compat.h"   /* define __MAIAC__, mapeia __Math__* etc. */

int main() {
    /* printf funciona em ambos:
       - MaiaC: built-in host import (sem declaração necessária)
       - gcc:   vem do #include <stdio.h> embutido no maiac_compat.h   */
    printf("sqrt(2) = %.4f\n", __Math__sqrt(2.0));

    /* __console__log funciona em ambos:
       - MaiaC: extern host import → console.log(...)
       - gcc:   macro → fprintf(stdout, "%s\n", msg) */
    __console__log("hello");

    return 0;
}
