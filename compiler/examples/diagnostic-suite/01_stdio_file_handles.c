/* Diagnostic: direct example using FILE-backed stdio file workflow. */
#include <stdio.h>

int main(void) {
    FILE *f;
    char buf[8];
    int n;

    f = fopen("diag_stdio.txt", "w+");
    if (!f) return 11;
    fwrite("abc", 1, 3, f);
    fseek(f, 0, 0);
    n = fread(buf, 1, 3, f);
    fclose(f);

    if (n == 3 && buf[0] == 'a' && buf[2] == 'c') return 0;
    return 12;
}