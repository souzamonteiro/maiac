/* Diagnostic: direct dist-runner path for setjmp/longjmp. */
#include <setjmp.h>

static jmp_buf env;

int dive(int n) {
    if (n == 0) {
        longjmp(env, 7);
    }
    return dive(n - 1);
}

int main(void) {
    int rc;

    rc = setjmp(env);
    if (rc != 0) return rc;
    dive(2);
    return 99;
}