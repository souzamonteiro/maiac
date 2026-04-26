#include <stdio.h>
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
    if (rc == 0) {
        dive(2);
    } else if (rc == 7) {
        printf("PASS setjmp_longjmp\n");
        printf("ALL PASS\n");
        return 0;
    }

    return 99;
}